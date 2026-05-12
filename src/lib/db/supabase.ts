/**
 * Supabase client'lari.
 *
 * - browserClient: NEXT_PUBLIC_* keylerle, RLS uygulanir.
 * - serverClient : service_role key ile, RLS bypass. SADECE server-side!
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/types/lead";
import { clientEnv, getServerEnv } from "@/lib/env";

/**
 * `public.leads` tablo satiri — DB snake_case ile birebir uyumlu.
 * Server tarafinda Supabase'ten cekilen ham veriyi tiplemek icin kullanilir.
 * Sema: supabase/schema.sql
 */
export interface LeadRow {
  id: string;
  created_at: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  intent: "demo" | "pricing" | "integration" | "support" | "other" | null;
  volume: "<500" | "500-5k" | "5k-50k" | "50k+" | null;
  current_tool: string | null;
  timeline: "this-week" | "this-month" | "this-quarter" | "researching" | null;
  preferred_contact_time: string | null;
  score: number;
  temperature: "hot" | "warm" | "cold";
  score_breakdown: Array<{ reason: string; delta: number }>;
  ai_summary: string | null;
  transcript: ChatMessage[];
  conversation_duration_sec: number | null;
  ip_hash: string | null;
  user_agent: string | null;
  honeypot_filled: boolean;
  status: "new" | "contacted" | "qualified" | "rejected";
}

export function getBrowserClient(): SupabaseClient {
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

export function getServerClient(): SupabaseClient {
  const env = getServerEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
