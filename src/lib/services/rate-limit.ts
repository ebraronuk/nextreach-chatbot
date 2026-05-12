/**
 * Rate limit servisi — adapter pattern.
 *
 * Iki implementasyon:
 *   - InMemoryAdapter : single-instance icin (dev + tek serverless container).
 *   - UpstashAdapter  : production icin (Redis REST API), Vercel'in coklu-instance
 *                       modeline dayanikli. Env varsa otomatik secilir.
 *
 * Public API tek bir async fonksiyon: `checkRateLimit(key)` →
 * `{ allowed, retryAfterSec }`. route.ts buna karsi yaziyor; backend swap'i
 * env degisikligi ile.
 *
 * Window/limit/parametreler tek bir yerde — constants/rate-limit.ts'e
 * tasimadik cunku tek tuketim noktasi var.
 */
import { getServerEnv } from "@/lib/env";

export interface RateLimitResult {
  allowed: boolean;
  /** 429 doniliyorsa, kullaniciya kac saniye sonra tekrar denemesini soyleyecegimiz tahmin. */
  retryAfterSec: number;
}

export interface RateLimitAdapter {
  check(key: string): Promise<RateLimitResult>;
}

// Konfigurasyon — IP basina 10 dk pencerede 3 submission
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 3;

// ---------------------------------------------------------------------------
// In-memory adapter (single-instance fallback)
// ---------------------------------------------------------------------------
export function createInMemoryAdapter(): RateLimitAdapter {
  const buckets = new Map<string, number[]>();
  // Periyodik prune — bucket'lar buyumesin diye
  const PRUNE_EVERY = 100;
  let calls = 0;

  function prune(now: number): void {
    for (const [k, ts] of buckets.entries()) {
      const kept = ts.filter((t) => now - t < WINDOW_MS);
      if (kept.length === 0) buckets.delete(k);
      else if (kept.length !== ts.length) buckets.set(k, kept);
    }
  }

  return {
    async check(key: string): Promise<RateLimitResult> {
      const now = Date.now();
      calls++;
      if (calls >= PRUNE_EVERY) {
        prune(now);
        calls = 0;
      }
      const prev = buckets.get(key) ?? [];
      const recent = prev.filter((t) => now - t < WINDOW_MS);
      if (recent.length >= LIMIT) {
        buckets.set(key, recent);
        const oldest = recent[0];
        const retryMs = Math.max(0, WINDOW_MS - (now - oldest));
        return { allowed: false, retryAfterSec: Math.ceil(retryMs / 1000) };
      }
      recent.push(now);
      buckets.set(key, recent);
      return { allowed: true, retryAfterSec: 0 };
    },
  };
}

// ---------------------------------------------------------------------------
// Upstash adapter (REST API uzerinden, ekstra paket gerektirmez)
// ---------------------------------------------------------------------------
/**
 * Upstash REST API ile basit komut calistirici.
 * Body: ["CMD", "arg1", "arg2", ...] -> { result: any }
 */
async function upstashCommand(
  url: string,
  token: string,
  command: (string | number)[],
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    // Vercel edge'de fetch cache problemi olmasin
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Upstash REST ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { result?: unknown };
  return json.result;
}

export function createUpstashAdapter(url: string, token: string): RateLimitAdapter {
  return {
    async check(key: string): Promise<RateLimitResult> {
      // Sliding-ish window: INCR + EXPIRE pattern.
      // Pencere 10 dk; bucket key'i dakika cinsinden 10'a yuvarliyoruz, bu yuzden
      // bir kullanicinin pencere tam icindeyken sayilari paylasilmis olur.
      // Edge bursting (pencere kesisiminde 2x limit) teorik problem ama 3/10dk
      // kuralinda kabul edilebilir.
      const now = Date.now();
      const bucketKey = `rl:lead:${key}:${Math.floor(now / WINDOW_MS)}`;
      const ttlSec = Math.ceil(WINDOW_MS / 1000);

      // Tek round-trip icin pipeline: [INCR, EXPIRE]
      // Upstash REST bunu "transaction" endpoint'iyle de destekler; biz iki
      // ayri call yaparak basit tutuyoruz — INCR'in geri donus degeri kafidir.
      const count = await upstashCommand(url, token, ["INCR", bucketKey]);
      // Ilk increment'te TTL setle (race olsa bile sonuc benzer)
      if (typeof count === "number" && count === 1) {
        await upstashCommand(url, token, ["EXPIRE", bucketKey, ttlSec]).catch(() => {
          /* ignore — TTL set fail'i critik degil, sonraki bucket'ta duzelir */
        });
      }
      if (typeof count !== "number") {
        // Beklenmedik cevap — hata yerine sessizce allow et (rate limit fail-open)
        return { allowed: true, retryAfterSec: 0 };
      }
      if (count > LIMIT) {
        // Tahmin: pencerenin sonuna kadar bekle
        const windowEnd =
          (Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS;
        return {
          allowed: false,
          retryAfterSec: Math.max(1, Math.ceil((windowEnd - now) / 1000)),
        };
      }
      return { allowed: true, retryAfterSec: 0 };
    },
  };
}

// ---------------------------------------------------------------------------
// Module-level adapter — env'e gore secilir, bir kez initialize
// ---------------------------------------------------------------------------
let cachedAdapter: RateLimitAdapter | null = null;

function getAdapter(): RateLimitAdapter {
  if (cachedAdapter) return cachedAdapter;
  const env = getServerEnv();
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    cachedAdapter = createUpstashAdapter(
      env.UPSTASH_REDIS_REST_URL,
      env.UPSTASH_REDIS_REST_TOKEN,
    );
  } else {
    cachedAdapter = createInMemoryAdapter();
  }
  return cachedAdapter;
}

/** route.ts'in cagiracagi tek fonksiyon. */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  return getAdapter().check(key);
}

/** Test amacli — adapter'i degistirmek icin (testlerden cagrilir). */
export function __setAdapterForTesting(adapter: RateLimitAdapter | null): void {
  cachedAdapter = adapter;
}
