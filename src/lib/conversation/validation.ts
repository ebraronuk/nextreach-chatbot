/**
 * Chatbot input validasyonlari.
 * Kullanici hatalari Turkce, log/teknik hatalar Ingilizce.
 *
 * 2 katmanli yaklasim:
 *   1. Format validasyonlari (Zod) — min/max len, email format
 *   2. Anlam validasyonlari (Turkce dilbilimsel) — selamlama, ret, soru tespiti
 *
 * Boylece "naber kiz" -> isim olarak alinmaz, "olmaz" -> ret olarak yorumlanir.
 */
import { z } from "zod";
import { PERSONAL_EMAIL_DOMAINS } from "@/constants/email";

// ---------------------------------------------------------------------------
// 1) Zod semalari — format kontrolu
// ---------------------------------------------------------------------------
export const nameSchema = z
  .string()
  .trim()
  .min(2, "Adınız en az 2 karakter olmalı.")
  .max(60, "Adınız çok uzun, kısaltabilir misiniz?");

export const companySchema = z
  .string()
  .trim()
  .min(2, "Şirket adı en az 2 karakter olmalı.")
  .max(100, "Şirket adı çok uzun.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Bu bir e-posta adresi gibi görünmüyor. Tekrar dener misiniz?");

export const currentToolSchema = z
  .string()
  .trim()
  .min(1)
  .max(200);

// ---------------------------------------------------------------------------
// 2) Anlam tespitleri — Turkce dilbilimsel sezgisel kurallar
// ---------------------------------------------------------------------------

/** Sadece selamlama mi? Niyet yok, sadece "selam" / "naber" gibi. */
const GREETING_PATTERNS = [
  /^selam(\s|$)/,
  /^selamlar/,
  /^merhaba/,
  /^merhabalar/,
  /^naber/,
  /^napiyon/,
  /^napıyon/,
  /^napıyorsun/,
  /^napiyorsun/,
  /^hi(\s|$)/,
  /^hey(\s|$)/,
  /^hello/,
  /^iyi gunler/,
  /^iyi günler/,
  /^iyi aksamlar/,
  /^iyi akşamlar/,
  /^gunaydin/,
  /^günaydın/,
  /^kolay gelsin/,
];

/** Saldirgan / argo / cinsiyetci hitap kaliplari. Niyet yok, redirect gerek. */
const DISMISSIVE_PATTERNS = [
  /\bkiz\b/i,
  /\bkız\b/i,
  /\bcanim\b/i,
  /\bcanım\b/i,
  /\bguzelim\b/i,
  /\bgüzelim\b/i,
  /\bablam\b/i,
  /\bbenim/i,
  /\bbebeg/i,
  /\bbebek\b/i,
];

/** Ret / reddetme — "olmaz", "vermem", "istemiyorum" vs. */
const REFUSAL_WORDS = [
  "olmaz",
  "hayir",
  "hayır",
  "yok",
  "yokum",
  "vermem",
  "vermek istemiyorum",
  "soylemem",
  "söylemem",
  "soylemek istemiyorum",
  "söylemek istemiyorum",
  "istemiyorum",
  "gecmek istiyorum",
  "geçmek istiyorum",
  "gecelim",
  "geçelim",
  "atla",
  "skip",
  "no",
  "nope",
  "neden soruyorsun",
  "niye soruyorsun",
  "bos ver",
  "boş ver",
];

/** Soru kaliplari — Gemini fallback'e yonlendirme. */
const QUESTION_STARTERS = [
  "ne ",
  "ne kadar",
  "neden",
  "niye",
  "nasil",
  "nasıl",
  "kac ",
  "kaç ",
  "hangi ",
  "kim ",
  "kimle",
  "kime",
  "fiyat",
  "ucret",
  "ücret",
  "maliyet",
  "demo ",
  "destek",
  "entegrasyon",
  "ozellik",
  "özellik",
];

/** Anlamli kelime icermeyen "junk" girdiler (sadece emoji, noktalama, vb.) */
function isJunkInput(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  // En az 2 harfli bir kelime var mi?
  const hasMeaningfulWord = /[a-zA-Zçğıöşüâîûéè]{2,}/.test(trimmed);
  return !hasMeaningfulWord;
}

export function isPureGreeting(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length === 0 || t.length > 50) return false;
  return GREETING_PATTERNS.some((p) => p.test(t));
}

export function isDismissive(text: string): boolean {
  return DISMISSIVE_PATTERNS.some((p) => p.test(text));
}

export function looksLikeRefusal(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length === 0) return false;
  // Tek kelime / kısa cümle olmalı (refusal genelde kısa)
  if (t.length > 80) return false;
  return REFUSAL_WORDS.some((word) => {
    // Tam kelime eşleşmesi (substring değil — "yok" "okul"da geçmesin)
    const re = new RegExp(`(^|\\s|[.,!?])${word}(\\s|$|[.,!?])`, "i");
    return re.test(t);
  });
}

export function looksLikeQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length === 0) return false;
  if (t.endsWith("?")) return true;
  return QUESTION_STARTERS.some((s) => t.startsWith(s));
}

// ---------------------------------------------------------------------------
// 3) Parse fonksiyonlari — anlam katmanini da uyguluyor
// ---------------------------------------------------------------------------
export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; reason?: "refusal" | "dismissive" | "format" | "junk" };

export function parseName(input: string): ParseResult<string> {
  const trimmed = input.trim();

  // Anlam katmani — refusal/junk yakalama
  if (isJunkInput(trimmed)) {
    return {
      ok: false,
      reason: "junk",
      error: "Adınızı yazar mısınız? Sadece bir kelime de yeterli.",
    };
  }
  if (looksLikeRefusal(trimmed)) {
    return {
      ok: false,
      reason: "refusal",
      error:
        "İletişim talebinizi oluşturabilmem için sadece adınız yeterli. Soyad gerekmiyor — istediğiniz takma adı bile kullanabilirsiniz.",
    };
  }

  // Format katmani
  const r = nameSchema.safeParse(trimmed);
  if (!r.success) {
    return { ok: false, reason: "format", error: r.error.issues[0]?.message ?? "Geçersiz isim." };
  }
  return { ok: true, value: r.data };
}

export function parseCompany(input: string): ParseResult<string> {
  const trimmed = input.trim();

  if (isJunkInput(trimmed)) {
    return {
      ok: false,
      reason: "junk",
      error: "Şirket adını kısaca yazar mısınız?",
    };
  }
  if (looksLikeRefusal(trimmed)) {
    return {
      ok: false,
      reason: "refusal",
      error:
        "Şirket bilgisi satış ekibimizin size daha iyi yardımcı olması için. Bağımsız çalışıyorsanız 'Bireysel' yazabilirsiniz.",
    };
  }

  const r = companySchema.safeParse(trimmed);
  if (!r.success) {
    return { ok: false, reason: "format", error: r.error.issues[0]?.message ?? "Geçersiz şirket adı." };
  }
  return { ok: true, value: r.data };
}

export function parseEmail(input: string): ParseResult<{ email: string; isPersonal: boolean }> {
  const trimmed = input.trim();

  if (looksLikeRefusal(trimmed)) {
    return {
      ok: false,
      reason: "refusal",
      error:
        "E-posta olmadan size dönüş yapamıyoruz. Sadece bu talep için kullanılacak — pazarlama iletisi göndermiyoruz.",
    };
  }

  const r = emailSchema.safeParse(trimmed);
  if (!r.success) {
    return { ok: false, reason: "format", error: r.error.issues[0]?.message ?? "Geçersiz e-posta." };
  }
  const email = r.data;
  const domain = email.split("@")[1] ?? "";
  return { ok: true, value: { email, isPersonal: PERSONAL_EMAIL_DOMAINS.has(domain) } };
}

export function parseCurrentTool(input: string): ParseResult<string> {
  const trimmed = input.trim();

  if (isJunkInput(trimmed)) {
    return {
      ok: false,
      reason: "junk",
      error: "Kısa bir not yazabilir misiniz? Örnek: 'Shopify Analytics' veya 'Excel'.",
    };
  }
  if (looksLikeRefusal(trimmed)) {
    return {
      ok: true,
      // Refusal -> kullanmadiklarini varsay
      value: "Belirtmek istemedi",
    };
  }

  const r = currentToolSchema.safeParse(trimmed);
  if (!r.success) {
    return { ok: false, reason: "format", error: "Lütfen kısa bir açıklama yazın." };
  }
  return { ok: true, value: r.data };
}
