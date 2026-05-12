/**
 * Leads servisi — Supabase tablo etkilesimleri burada toplaniyor.
 *
 * route.ts artik HTTP isiyle (parse, response, header) ilgileniyor; "lead nasil
 * insert edilir, post-insert ne calistirilir" mantigi bu dosyada. Test edilebilir
 * ve baska bir entry point'ten (cron, batch import, vs.) cagrilabilir.
 */
import { after } from "next/server";
import { getServerClient, type LeadRow } from "@/lib/db/supabase";
import { scoreLead } from "@/lib/scoring/score";
import { summarizeLead } from "@/lib/ai/summary";
import { getServerEnv } from "@/lib/env";
import type { ChatMessage, Intent, LeadInput, Volume, Timeline } from "@/types/lead";

export type ScoreBreakdown = Array<{ reason: string; delta: number }>;

export interface CreateLeadInput {
  name: string;
  company: string;
  email: string;
  phone?: string;
  intent?: Intent;
  volume?: Volume;
  currentTool?: string;
  timeline?: Timeline | null;
  preferredContactTime?: string;
  transcript: ChatMessage[];
  conversationDurationSec: number;
  ipHash: string;
  userAgent: string | null;
}

export interface CreateLeadResult {
  ok: true;
  id: string;
  score: number;
  temperature: "hot" | "warm" | "cold";
  breakdown: ScoreBreakdown;
}

export interface CreateLeadFailure {
  ok: false;
  reason: "db_error";
  detail?: string;
}

/**
 * Bir lead'i scoring + insert + async post-processing ile birlikte kaydeder.
 *
 * - Skor ve breakdown hesaplanir
 * - Supabase'e insert edilir
 * - Insert basarili olursa `after()` ile AI ozet uretimi ve hot-lead webhook'u
 *   tetiklenir (response'u bloklamadan).
 */
export async function createLead(
  input: CreateLeadInput,
): Promise<CreateLeadResult | CreateLeadFailure> {
  const scoreInput: LeadInput = {
    name: input.name,
    company: input.company,
    email: input.email,
    intent: input.intent,
    volume: input.volume,
    currentTool: input.currentTool,
    timeline: input.timeline ?? undefined,
    conversationDurationSec: input.conversationDurationSec,
  };
  const { score, breakdown, temperature } = scoreLead(scoreInput);

  const supabase = getServerClient();
  const payload = {
    name: input.name.trim(),
    company: input.company.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    intent: input.intent ?? null,
    volume: input.volume ?? null,
    current_tool: input.currentTool?.trim() || null,
    timeline: input.timeline ?? null,
    preferred_contact_time: input.preferredContactTime?.trim() || null,
    score,
    temperature,
    score_breakdown: breakdown,
    transcript: input.transcript,
    conversation_duration_sec: input.conversationDurationSec,
    ip_hash: input.ipHash,
    user_agent: input.userAgent,
    honeypot_filled: false,
    status: "new" as const,
  };

  const { data: inserted, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[services/leads] insert failed", error);
    return { ok: false, reason: "db_error", detail: error?.message };
  }

  // Async: AI ozet + hot lead webhook — response'u bloklamaz
  after(() => runPostInsert(inserted.id, input, score));

  return { ok: true, id: inserted.id, score, temperature, breakdown };
}

// ---------------------------------------------------------------------------
// Listing & status update
// ---------------------------------------------------------------------------

export interface ListLeadsFilter {
  status?: string;
  temperature?: string;
  since?: string;
}

export async function listLeads(filter: ListLeadsFilter): Promise<LeadRow[]> {
  const supabase = getServerClient();
  let query = supabase.from("leads").select("*").order("score", { ascending: false });

  if (filter.status && ["new", "contacted", "qualified", "rejected"].includes(filter.status)) {
    query = query.eq("status", filter.status);
  }
  if (filter.temperature && ["hot", "warm", "cold"].includes(filter.temperature)) {
    query = query.eq("temperature", filter.temperature);
  }
  if (filter.since) {
    const d = new Date(filter.since);
    if (!Number.isNaN(d.getTime())) {
      query = query.gte("created_at", d.toISOString());
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("[services/leads] list failed", error);
    throw new Error("list_failed");
  }
  return (data ?? []) as LeadRow[];
}

export type LeadStatus = "new" | "contacted" | "qualified" | "rejected";

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "db_error" }> {
  const supabase = getServerClient();
  const { data: updated, error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[services/leads] status update failed", error);
    return { ok: false, reason: "db_error" };
  }
  if (!updated) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Post-insert side effects (AI summary + hot lead webhook)
// ---------------------------------------------------------------------------

async function runPostInsert(
  leadId: string,
  input: CreateLeadInput,
  score: number,
): Promise<void> {
  const supabase = getServerClient();
  let summary: string | null = null;

  try {
    summary = await summarizeLead({
      name: input.name,
      company: input.company,
      email: input.email,
      intent: input.intent,
      volume: input.volume,
      currentTool: input.currentTool,
      timeline: input.timeline ?? undefined,
      transcript: input.transcript,
    });

    if (summary) {
      const { error } = await supabase
        .from("leads")
        .update({ ai_summary: summary })
        .eq("id", leadId);
      if (error) {
        console.error(
          JSON.stringify({ event: "lead_summary_update_failed", leadId, err: error.message }),
        );
      }
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "lead_summary_failed",
        leadId,
        err: err instanceof Error ? err.message : String(err),
      }),
    );
  }

  const webhookUrl = getServerEnv().HOT_LEAD_WEBHOOK_URL;
  if (score >= 80 && webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          company: input.company,
          email: input.email,
          score,
          summary,
          adminPath: "/admin",
        }),
      });
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "lead_hot_webhook_failed",
          leadId,
          err: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
