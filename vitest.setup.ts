/**
 * Vitest setup — testler import edilmeden once env dummy degerleri set ediliyor.
 *
 * lib/env.ts module load'da clientEnv'i parse edip dogruluyor. Testlerde gercek
 * env yok; dummy degerler tip kontrolu icin yeterli (servisler env'i sadece
 * production runtime'da kullanir).
 */
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-key";
process.env.GEMINI_API_KEY ??= "test-gemini-key";
process.env.ADMIN_SECRET_KEY ??= "test-admin-key-min-8";
