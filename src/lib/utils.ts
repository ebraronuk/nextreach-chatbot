/**
 * Genel (client-safe) yardimci fonksiyonlar.
 *
 * Server-only yardimcilar icin -> @/lib/server-utils.ts (hashIp vb.).
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
