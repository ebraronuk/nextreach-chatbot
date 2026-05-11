/**
 * Supabase client'lari.
 *
 * - browserClient: NEXT_PUBLIC_* keylerle, RLS uygulanir.
 * - serverClient : service_role key ile, RLS bypass. SADECE server-side!
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
