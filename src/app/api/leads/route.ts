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
import { after } from "next/server";
import { z } from "zod";
import { getServerClient } from "@/lib/db/supabase";
import { scoreLead } from "@/lib/scoring/score";
import { summarizeLead } from "@/lib/ai/summary";
import { hashIp } from "@/lib/server-utils";
import { isDisposableEmail } from "@/constants/email";
import { getServerEnv } from "@/lib/env";

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
  // Chatbot "Atla" chip'i timeline: null gonderebiliyor. Hem null hem undefined kabul.
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
// Disposable email blacklist taşındı -> constants/email.ts (DRY)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Rate limit (in-memory; 10 dk pencerede IP basina 3 submission)
// Long-lived process'de bucket Map size buyur — her N submission'da prune.
// Vercel'de instance ~10dk yasar, sorun degil; uzun yasayan deploy'lar icin
// koruma.
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 3;
const PRUNE_EVERY = 100; // her 100 cagrida bir map'i temizle
const ipBucket = new Map<string, number[]>();
let callsSinceLastPrune = 0;

function pruneRateBucket(now: number): void {
  for (const [key, timestamps] of ipBucket.entries()) {
    const kept = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
    if (kept.length === 0) ipBucket.delete(key);
    else if (kept.length !== timestamps.length) ipBucket.set(key, kept);
  }
}

function checkAndRecordRate(ipHash: string): boolean {
  const now = Date.now();
  callsSinceLastPrune++;
  if (callsSinceLastPrune >= PRUNE_EVERY) {
    pruneRateBucket(now);
    callsSinceLastPrune = 0;
  }
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

  // Scoring — LeadInput timeline'i null kabul etmiyor; null'i undefined'a coerce et.
  const { score, breakdown, temperature } = scoreLead({
    ...data,
    timeline: data.timeline ?? undefined,
  });

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
    timeline: data.timeline ?? null, // hem null hem undefined buraya dusebilir
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

  // Async: AI ozet + hot lead webhook. Next.js `after()` Vercel'de response
  // dondukten sonra runtime'in islemi tamamlamasini garanti eder; void Promise
  // patterni serverless'da kaybolabiliyor.
  after(() => runAfterInsert(inserted.id, data, score));

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
      timeline: data.timeline ?? undefined,
      transcript: data.transcript,
    });

    if (summary) {
      const { error } = await supabase
        .from("leads")
        .update({ ai_summary: summary })
        .eq("id", leadId);
      if (error) {
        console.error(JSON.stringify({
          event: "lead_summary_update_failed",
          leadId,
          err: error.message,
        }));
      }
    }
  } catch (err) {
    console.error(JSON.stringify({
      event: "lead_summary_failed",
      leadId,
      err: err instanceof Error ? err.message : String(err),
    }));
  }

  const webhookUrl = getServerEnv().HOT_LEAD_WEBHOOK_URL;
  if (score >= 80 && webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // ADMIN_SECRET_KEY webhook receiver loglarinda sizmasin diye sadece
          // relative path gonderiyoruz; alici tarafi anahtari kendi env'inde tutmali.
          name: data.name,
          company: data.company,
          email: data.email,
          score,
          summary,
          adminPath: "/admin",
        }),
      });
    } catch (err) {
      console.error(JSON.stringify({
        event: "lead_hot_webhook_failed",
        leadId,
        err: err instanceof Error ? err.message : String(err),
      }));
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
  // .select("id").maybeSingle() ile etkilenen satiri geri istiyoruz:
  // id eslesmediginde Supabase hata vermiyor; bu kontrol sessiz no-op'u engeller.
  const { data: updated, error } = await supabase
    .from("leads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[/api/leads PATCH] supabase error", error);
    return NextResponse.json({ ok: false, message: "Guncelleme basarisiz." }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { ok: false, message: "Lead bulunamadi." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
