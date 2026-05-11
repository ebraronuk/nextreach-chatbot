/**
 * Chatbot input validasyonlari.
 * Kullanici hatalari Turkce, log/teknik hatalar Ingilizce.
 */
import { z } from "zod";

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.com.tr",
  "outlook.com",
  "outlook.com.tr",
  "live.com",
  "yahoo.com",
  "yahoo.com.tr",
  "icloud.com",
  "me.com",
  "mac.com",
  "yandex.com",
  "yandex.com.tr",
  "protonmail.com",
  "proton.me",
  "aol.com",
  "mail.com",
  "gmx.com",
]);

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Adiniz en az 2 karakter olmali.")
  .max(60, "Adiniz cok uzun, kisaltabilir misiniz?");

export const companySchema = z
  .string()
  .trim()
  .min(2, "Sirket adi en az 2 karakter olmali.")
  .max(100, "Sirket adi cok uzun.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Bu bir e-posta adresi gibi gorunmuyor. Tekrar dener misiniz?");

export const currentToolSchema = z
  .string()
  .trim()
  .min(1)
  .max(200);

/** name parse + temizle. Hata varsa Result.error mesaji. */
export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function parseName(input: string): ParseResult<string> {
  const r = nameSchema.safeParse(input);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Gecersiz isim." };
  return { ok: true, value: r.data };
}

export function parseCompany(input: string): ParseResult<string> {
  const r = companySchema.safeParse(input);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Gecersiz sirket adi." };
  return { ok: true, value: r.data };
}

export function parseEmail(input: string): ParseResult<{ email: string; isPersonal: boolean }> {
  const r = emailSchema.safeParse(input);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Gecersiz e-posta." };
  const email = r.data;
  const domain = email.split("@")[1] ?? "";
  return { ok: true, value: { email, isPersonal: PERSONAL_EMAIL_DOMAINS.has(domain) } };
}

export function parseCurrentTool(input: string): ParseResult<string> {
  const r = currentToolSchema.safeParse(input);
  if (!r.success) return { ok: false, error: "Lutfen kisa bir aciklama yazin." };
  return { ok: true, value: r.data };
}
