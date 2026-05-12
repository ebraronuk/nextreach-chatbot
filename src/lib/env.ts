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
 * Onemli: Next.js .env.local'daki "VAR=" satirini bos string ("") olarak okur.
 * Zod'un .optional() sadece undefined'i kabul eder; bos string .url() kontrolunden
 * geceler. Bu yuzden tum optional URL alanlarini preprocess ile bos -> undefined
 * cevriliyor.
 */
import { z } from "zod";

/**
 * Bos string veya bos kelimeli string'leri undefined'a cevirir.
 * .env.local'da "HOT_LEAD_WEBHOOK_URL=" satiri "" olarak okunur — biz bunu
 * "tanimlanmamis" olarak yorumluyoruz.
 */
const emptyToUndefined = (v: unknown): unknown =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

// ---------------------------------------------------------------------------
// Client env — module load'da parse, NEXT_PUBLIC_* yalnizca
// ---------------------------------------------------------------------------
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_ANALYTICS_BEACON_URL: optionalUrl,
});

function parseClient(): z.infer<typeof clientSchema> {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ANALYTICS_BEACON_URL: process.env.NEXT_PUBLIC_ANALYTICS_BEACON_URL,
  });
  if (!result.success) {
    const flat = result.error.flatten();
    console.error("[env] client env validation failed", {
      fieldErrors: flat.fieldErrors,
      formErrors: flat.formErrors,
    });
    throw new Error(
      `Client env validation failed: ${JSON.stringify({
        fieldErrors: flat.fieldErrors,
        formErrors: flat.formErrors,
      })}`,
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
  HOT_LEAD_WEBHOOK_URL: optionalUrl,
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
    const flat = result.error.flatten();
    console.error("[env] server env validation failed", {
      fieldErrors: flat.fieldErrors,
      formErrors: flat.formErrors,
    });
    throw new Error(
      `Server env validation failed: ${JSON.stringify({
        fieldErrors: flat.fieldErrors,
        formErrors: flat.formErrors,
      })}`,
    );
  }
  cachedServerEnv = result.data;
  return cachedServerEnv;
}
