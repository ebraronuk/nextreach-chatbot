/**
 * Server-only yardimcilar.
 *
 * Bu dosyayi sadece server runtime (route.ts, server component, server action)
 * import etmeli. Client'a sizmasin diye `import "server-only"` ile guard.
 */
import "server-only";
import { getServerEnv } from "@/lib/env";

/**
 * IP'yi anonimlestir (GDPR icin SHA-256 hash + admin secret salt).
 * Admin secret rotasyonu gectiginde eski hash'ler dogal olarak invalid olur,
 * bu istenen davranis.
 */
export async function hashIp(ip: string): Promise<string> {
  const salt = getServerEnv().ADMIN_SECRET_KEY;
  const data = new TextEncoder().encode(ip + salt);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
