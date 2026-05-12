/**
 * Rate limit servisi — in-memory adapter testleri.
 *
 * Upstash adapter'i fetch'e bagimli; gercek bir Upstash instance'i olmadan
 * test edilemez. Onun yerine in-memory adapter'in kontrol mantigini test
 * ediyoruz — esit mantik Upstash'de de hedefleniyor.
 */
import { describe, expect, it } from "vitest";
import { createInMemoryAdapter } from "./rate-limit";

describe("InMemoryAdapter", () => {
  it("ilk LIMIT (3) istek allowed doner", async () => {
    const a = createInMemoryAdapter();
    const r1 = await a.check("ip-1");
    const r2 = await a.check("ip-1");
    const r3 = await a.check("ip-1");
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
  });

  it("LIMIT asilinca 4. istek allowed=false ve retryAfterSec > 0 doner", async () => {
    const a = createInMemoryAdapter();
    await a.check("ip-2");
    await a.check("ip-2");
    await a.check("ip-2");
    const r4 = await a.check("ip-2");
    expect(r4.allowed).toBe(false);
    expect(r4.retryAfterSec).toBeGreaterThan(0);
  });

  it("farkli ip'ler birbirini etkilemez", async () => {
    const a = createInMemoryAdapter();
    await a.check("ip-A");
    await a.check("ip-A");
    await a.check("ip-A");
    const otherIp = await a.check("ip-B");
    expect(otherIp.allowed).toBe(true);
  });

  it("ayni adapter ornegi state tutar (paylasilan bucket)", async () => {
    const a = createInMemoryAdapter();
    for (let i = 0; i < 3; i++) await a.check("ip-3");
    const sixth = await a.check("ip-3");
    expect(sixth.allowed).toBe(false);
  });
});
