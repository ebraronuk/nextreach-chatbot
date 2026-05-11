/**
 * Supabase client'lari.
 *
 * - browserClient: NEXT_PUBLIC_* keylerle, RLS uygulanir.
 * - serverClient : service_role key ile, RLS bypass. SADECE server-side!
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/types/lead";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL tanimli degil. .env.local'i kontrol et.");
}

export function getBrowserClient(): SupabaseClient {
  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY tanimli degil.");
  }
  return createClient(url!, anonKey, {
    auth: { persistSession: false },
  });
}

export function getServerClient(): SupabaseClient {
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY tanimli degil. Sadece server-side kullanim icin gerekli.",
    );
  }
  return createClient(url!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
