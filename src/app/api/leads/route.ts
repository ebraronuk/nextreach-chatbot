/**
 * Leads API.
 *
 * POST   /api/leads             -> Lead kaydet (chatbot tamamlandiginda).
 * GET    /api/leads?key=...     -> Admin'de listele (filtre destekli).
 * PATCH  /api/leads?key=...     -> Lead status'unu guncelle.
 *
 * Notlar:
 * - Body validasyonu Zod ile. Browser tarafindan gelen body'ye guvenmiyoruz.
 * - In-memory rate limit; serverless'da best-effort (tek instance icin yeterli).
 * - AI ozet ve hot-lead webhook fire-and-forget; insert'i bloklamaz.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { scoreLead } from "@/lib/scoring/score";
import { summarizeLead } from "@/lib/ai/summary";
import { hashIp } from "@/lib/utils";

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
  timeline: z.enum(["this-week", "this-month", "this-quarter", "researching"]).optional(),
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
// Disposable email blacklist
// Kapsamli olmasi gerekmiyor — bu MVP icin kisa, sik gorulen liste yeter.
// Tam liste icin ileride disposable-email-domains paketi entegre edilebilir.
// ---------------------------------------------------------------------------
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "sharklasers.com",
  "yopmail.com",
  "throwawaymail.com",
  "maildrop.cc",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "fakeinbox.com",
  "mintemail.com",
  "spam4.me",
  "33mail.com",
  "trbvm.com",
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return Boolean(domain && DISPOSABLE_DOMAINS.has(domain));
}

// ---------------------------------------------------------------------------
// Rate limit (in-memory; 10 dk pencerede IP basina 3 submission)
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 3;
const ipBucket = new Map<string, number[]>();

function checkAndRecordRate(ipHash: string): boolean {
  const now = Date.now();
  const prev = ipBucket.get(ipHash) ?? [];
  const recent = prev.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    ipBucket.set(ipHash, recent);
    return false;
  }
  recent.push(now);
  ipBucket.set(ipHash, recent);
  return true;
}

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function isAdmin(req: NextRequest): boolean {
  const expected = process.env.ADMIN_SECRET_KEY;
  const key = req.nextUrl.searchParams.get("key");
  return Boolean(expected) && key === expected;
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

  // Honeypot: bot doldurursa 200 don ama yazma. Sessizce rejected.
  if (data.honeypot && data.honeypot.trim().length > 0) {
    console.warn("[/api/leads POST] honeypot triggered — silent reject");
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Disposable email engelleme. Kullaniciya net mesaj veriyoruz cunku
  // gercek bir kisi yanlislikla yazmis olabilir.
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

  // IP hash + rate limit
  const ip = getClientIp(req);
  const ipH = await hashIp(ip);
  if (!checkAndRecordRate(ipH)) {
    return NextResponse.json(
      { ok: false, message: "Cok fazla istek aldik. Lutfen biraz sonra tekrar deneyin." },
      { status: 429 },
    );
  }

  // Scoring
  const { score, breakdown, temperature } = scoreLead(data);

  // Insert
  const supabase = getServerClient();
  const insertPayload = {
    name: data.name.trim(),
    company: data.company.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone?.trim() || null,
    intent: data.intent ?? null,
    volume: data.volume ?? null,
    current_tool: data.currentTool?.trim() || null,
    timeline: data.timeline ?? null,
    preferred_contact_time: data.preferredContactTime?.trim() || null,
    score,
    temperature,
    score_breakdown: breakdown,
    transcript: data.transcript,
    conversation_duration_sec: data.conversationDurationSec,
    ip_hash: ipH,
    user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    honeypot_filled: false,
    status: "new" as const,
  };

  const { data: inserted, error } = await supabase
    .from("leads")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[/api/leads POST] supabase insert failed", error);
    return NextResponse.json(
      { ok: false, message: "Ufak bir terslik oldu, tekrar dener misiniz?" },
      { status: 500 },
    );
  }

  // Async: AI ozet + hot lead webhook. Bilerek await'lemiyoruz.
  void runAfterInsert(inserted.id, data, score);

  return NextResponse.json(
    { ok: true, id: inserted.id, score, temperature },
    { status: 201 },
  );
}

async function runAfterInsert(
  leadId: string,
  data: z.infer<typeof LeadBodySchema>,
  score: number,
): Promise<void> {
  const supabase = getServerClient();
  let summary: string | null = null;

  try {
    summary = await summarizeLead({
      name: data.name,
      company: data.company,
      email: data.email,
      intent: data.intent,
      volume: data.volume,
      currentTool: data.currentTool,
      timeline: data.timeline,
      transcript: data.transcript,
    });

    if (summary) {
      const { error } = await supabase
        .from("leads")
        .update({ ai_summary: summary })
        .eq("id", leadId);
      if (error) console.error("[runAfterInsert] summary update failed", error);
    }
  } catch (err) {
    console.error("[runAfterInsert] summary step failed", err);
  }

  if (score >= 80 && process.env.HOT_LEAD_WEBHOOK_URL) {
    try {
      await fetch(process.env.HOT_LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          company: data.company,
          email: data.email,
          score,
          summary,
          adminPath: `/admin?key=${process.env.ADMIN_SECRET_KEY ?? ""}`,
        }),
      });
    } catch (err) {
      console.error("[runAfterInsert] hot-lead webhook failed", err);
    }
  }
}

// ---------------------------------------------------------------------------
// GET — admin listele (filtre destekli)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz." }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const temperature = sp.get("temperature");
  const since = sp.get("since");

  const supabase = getServerClient();
  let query = supabase.from("leads").select("*").order("score", { ascending: false });

  if (status && ["new", "contacted", "qualified", "rejected"].includes(status)) {
    query = query.eq("status", status);
  }
  if (temperature && ["hot", "warm", "cold"].includes(temperature)) {
    query = query.eq("temperature", temperature);
  }
  if (since) {
    const d = new Date(since);
    if (!Number.isNaN(d.getTime())) {
      query = query.gte("created_at", d.toISOString());
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("[/api/leads GET] supabase error", error);
    return NextResponse.json({ ok: false, message: "Listeleme basarisiz." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, leads: data ?? [] });
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

  const supabase = getServerClient();
  const { error } = await supabase
    .from("leads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[/api/leads PATCH] supabase error", error);
    return NextResponse.json({ ok: false, message: "Guncelleme basarisiz." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
