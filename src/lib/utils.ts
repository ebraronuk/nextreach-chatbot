/**
 * Genel yardimci fonksiyonlar.
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * IP'yi anonimlestir (GDPR icin SHA-256 hash).
 */
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + (process.env.ADMIN_SECRET_KEY ?? ""));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
