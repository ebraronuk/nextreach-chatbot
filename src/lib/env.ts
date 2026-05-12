/**
 * Environment validation — Zod ile fail-fast.
 *
 * Iki ayri schema:
 *   - clientEnv (parse at import) : NEXT_PUBLIC_* — browser ve server her ikisi.
 *   - getServerEnv()   (lazy)     : Tum env'ler — sadece server runtime'da cagrilmali.
 *
 * Lazy server schema'nin sebebi: client bundle'a sizmasin diye Next.js
 * NEXT_PUBLIC_* olmayan env'leri inline'lamiyor. Build-time parse edilirse
 * undefined'larla crash olurdu; ilk gercek server cagrisinda parse ediyoruz.
 *
 * Hata sirasinda issue listesini logladiktan sonra detayli hata firlatiyoruz —
 * boylece "X env tanimli degil" yerine "NEXT_PUBLIC_SUPABASE_URL: Required"
 * gibi net mesaj alirsiniz.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Client env — module load'da parse, NEXT_PUBLIC_* yalnizca
// ---------------------------------------------------------------------------
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_ANALYTICS_BEACON_URL: z.string().url().optional(),
});

function parseClient(): z.infer<typeof clientSchema> {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ANALYTICS_BEACON_URL: process.env.NEXT_PUBLIC_ANALYTICS_BEACON_URL,
  });
  if (!result.success) {
    console.error("[env] client env validation failed", result.error.flatten().fieldErrors);
    throw new Error(
      `Client env validation failed: ${JSON.stringify(result.error.flatten().fieldErrors)}`,
    );
  }
  return result.data;
}

export const clientEnv = parseClient();

// ---------------------------------------------------------------------------
// Server env — lazy + cached, server-only
// ---------------------------------------------------------------------------
const serverSchema = clientSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  ADMIN_SECRET_KEY: z.string().min(8, "ADMIN_SECRET_KEY en az 8 karakter olmali"),
  HOT_LEAD_WEBHOOK_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

type ServerEnv = z.infer<typeof serverSchema>;
let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() client tarafinda cagrilamaz.");
  }
  if (cachedServerEnv) return cachedServerEnv;

  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    console.error("[env] server env validation failed", result.error.flatten().fieldErrors);
    throw new Error(
      `Server env validation failed: ${JSON.stringify(result.error.flatten().fieldErrors)}`,
    );
  }
  cachedServerEnv = result.data;
  return cachedServerEnv;
}
