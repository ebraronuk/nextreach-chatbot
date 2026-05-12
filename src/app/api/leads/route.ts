/**
 * Leads API — thin HTTP handler.
 *
 * POST   /api/leads             -> Lead kaydet
 * GET    /api/leads?key=...     -> Admin'de listele
 * PATCH  /api/leads?key=...     -> Status guncelle
 *
 * Mantik @/lib/services/leads.ts'de. Bu dosya sadece:
 *   - Zod body parse
 *   - Honeypot + rate limit + disposable email kontrolleri (request-level gates)
 *   - HTTP response shaping (status code, headers)
 * isiyle ilgileniyor.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashIp } from "@/lib/server-utils";
import { isDisposableEmail } from "@/constants/email";
import { getServerEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { createLead, listLeads, updateLeadStatus } from "@/lib/services/leads";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(8000),
  timestamp: z.string(),
});

const LeadBodySchema = z.object({
  name: z.string().min(1).max(120),
  company: z.string().min(1).max(200),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional(),
  intent: z.enum(["demo", "pricing", "integration", "support", "other"]).optional(),
  volume: z.enum(["<500", "500-5k", "5k-50k", "50k+"]).optional(),
  currentTool: z.string().max(120).optional(),
  timeline: z
    .enum(["this-week", "this-month", "this-quarter", "researching"])
    .nullable()
    .optional(),
  preferredContactTime: z.string().max(160).optional(),
  transcript: z.array(ChatMessageSchema).max(200).default([]),
  conversationDurationSec: z.number().int().min(0).max(86400).default(0),
  honeypot: z.string().max(500).optional(),
});

const PatchBodySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "contacted", "qualified", "rejected"]),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function isAdmin(req: NextRequest): boolean {
  const expected = getServerEnv().ADMIN_SECRET_KEY;
  const key = req.nextUrl.searchParams.get("key");
  return key === expected;
}

// ---------------------------------------------------------------------------
// POST — lead kaydet
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Gecersiz istek govdesi." },
      { status: 400 },
    );
  }

  const parsed = LeadBodySchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[/api/leads POST] validation error", parsed.error.flatten());
    return NextResponse.json(
      { ok: false, message: "Eksik veya hatali bilgi gonderildi." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Honeypot: bot doldurursa 200 don ama yazma. Sessizce reject.
  if (data.honeypot && data.honeypot.trim().length > 0) {
    console.warn("[/api/leads POST] honeypot triggered — silent reject");
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Disposable email — kullaniciya net mesaj veriyoruz.
  if (isDisposableEmail(data.email)) {
    console.warn("[/api/leads POST] disposable email rejected:", data.email);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Lütfen kurumsal bir e-posta adresi kullanın (geçici e-posta servisleri kabul edilmiyor).",
      },
      { status: 400 },
    );
  }

  // IP hash + rate limit (Upstash varsa dagitik, yoksa in-memory)
  const ip = getClientIp(req);
  const ipH = await hashIp(ip);
  const rl = await checkRateLimit(ipH);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: "Cok fazla istek aldik. Lutfen biraz sonra tekrar deneyin." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  // Service'e devret — scoring + insert + async post-processing icerir.
  const result = await createLead({
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.phone,
    intent: data.intent,
    volume: data.volume,
    currentTool: data.currentTool,
    timeline: data.timeline,
    preferredContactTime: data.preferredContactTime,
    transcript: data.transcript,
    conversationDurationSec: data.conversationDurationSec,
    ipHash: ipH,
    userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: "Ufak bir terslik oldu, tekrar dener misiniz?" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, id: result.id, score: result.score, temperature: result.temperature },
    { status: 201 },
  );
}

// ---------------------------------------------------------------------------
// GET — admin listele (filtre destekli)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz." }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  try {
    const leads = await listLeads({
      status: sp.get("status") ?? undefined,
      temperature: sp.get("temperature") ?? undefined,
      since: sp.get("since") ?? undefined,
    });
    return NextResponse.json({ ok: true, leads });
  } catch (err) {
    console.error("[/api/leads GET] failed", err);
    return NextResponse.json({ ok: false, message: "Listeleme basarisiz." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — status guncelle
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Gecersiz govde." }, { status: 400 });
  }

  const parsed = PatchBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Eksik veya hatali alanlar." }, { status: 400 });
  }

  const result = await updateLeadStatus(parsed.data.id, parsed.data.status);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ ok: false, message: "Lead bulunamadi." }, { status: 404 });
    }
    return NextResponse.json({ ok: false, message: "Guncelleme basarisiz." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
