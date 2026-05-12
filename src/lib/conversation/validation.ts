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

/**
 * Soru kaliplari (basta gecen).
 *
 * NOT: "demo", "fiyat", "destek" gibi konu-isimleri eskiden burada vardi —
 * "Demo almak istiyorum" gibi duz cumleler yanlislikla soru sayiliyordu.
 * Bunlari INFIX_KEYWORDS'e tasidik; soru olmasi icin gercekten soru-isareti
 * veya soru-kelimesi gerekiyor.
 */
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
  "kimsin",
  "nesin",
  "sen ",
  "siz ",
];

/**
 * Kimlik / "AI mısın?" tarzı sorular.
 * Bu kaliplar genelde soru isaretsiz gelir, QUESTION_STARTERS'a takilmaz.
 * Ornek: "insan misin ai misin", "bot musun", "yapay zeka misin"
 *
 * Turkce unlu uyumu: misin / mısın / musun / müsün — hepsini yakaliyoruz.
 */
const IDENTITY_QUESTION_PATTERNS = [
  /\b(insan|ai|yapay\s*zek[aâ]|bot|robot|chat\s*bot|asistan|gercek|gerçek|canl[ıi])\s*m[ıiuü]?s[ıiuü]n/i,
  /\bsen\s+(kim|ne|kac|kaç)\b/i,
  /\b(kimsin|nesin|kac yasin|kaç yaşın)\b/i,
];

/**
 * Cumle icinde herhangi bir yerde gecince soru sayilan kaliplar.
 * Ornek: "Pazaryeri destegi var mi", "Shopify ile uyumlu mu", "Aylik ne kadar tutar"
 *
 * Konu-isimleri ("fiyat", "demo", "destek") tek baslarina yetersiz — ancak
 * yaninda soru-kelimesi olursa anlamli. Bu yuzden burada sadece soru bagi
 * iceren kaliplar var.
 */
const QUESTION_INFIX_KEYWORDS = [
  "var mı",
  "var mi",
  "olur mu",
  "uyumlu mu",
  "destekliyor mu",
  "calisiyor mu",
  "çalışıyor mu",
  "yapabilir mi",
  "yapiyor mu",
  "yapıyor mu",
  "mumkun mu",
  "mümkün mü",
  "ne kadar",
  "nasil",
  "nasıl",
  "kaç tl",
  "kac tl",
  "kaç para",
  "kac para",
  "fiyat",
  "ucret",
  "ücret",
  "maliyet",
];

/** Anlamli kelime icermeyen "junk" girdiler (sadece emoji, noktalama, vb.) */
function isJunkInput(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  // En az 2 harfli bir kelime var mi?
  const hasMeaningfulWord = /[a-zA-Zçğıöşüâîûéè]{2,}/.test(trimmed);
  return !hasMeaningfulWord;
}

/**
 * Klavyede rastgele tuslayarak yazilan "isim gibi gorunen ama anlamsiz" metin tespiti.
 *
 * Yontem: Turkce fonetik ozellikler.
 *  - Turkce sesli harfler ~%40 oraninda gecer; %15'in altinda anormal.
 *  - Turkcede maks 3 ardisik sessiz harf gozlenir ("stres", "spor"); 5+ neredeyse imkansiz.
 *
 * "Ayşe", "Çelik", "Müğla-Köyceğiz", "Zeynep Yıldız" gibi gercek isimleri
 * yanlis pozitifle yakalamaz; "hgdsghsdghdsü", "jhfhg", "asdfgh" gibi tuş
 * basisi yakalanir.
 */
const TURKISH_VOWELS = "aeıioöuüâîû";
const LETTER_RE = /[a-zçğıöşüâîû]/;

function vowelRatio(text: string): number {
  const lower = text.toLocaleLowerCase("tr-TR");
  let vowels = 0;
  let letters = 0;
  for (const ch of lower) {
    if (LETTER_RE.test(ch)) {
      letters++;
      if (TURKISH_VOWELS.includes(ch)) vowels++;
    }
  }
  return letters === 0 ? 0 : vowels / letters;
}

function maxConsonantRun(text: string): number {
  const lower = text.toLocaleLowerCase("tr-TR");
  let max = 0;
  let current = 0;
  for (const ch of lower) {
    if (LETTER_RE.test(ch)) {
      if (TURKISH_VOWELS.includes(ch)) {
        if (current > max) max = current;
        current = 0;
      } else {
        current++;
      }
    } else {
      // boşluk / noktalama / rakam → run kesilir
      if (current > max) max = current;
      current = 0;
    }
  }
  return current > max ? current : max;
}

/**
 * Klavyede ardisik tuslar — "qwerty", "asdfgh", "zxcvbn" gibi.
 * Fonetik check bunu yakalamaz cunku e/u/i gibi sesliler var; ama 5+ harf
 * tek bir klavye satirindan geliyorsa neredeyse kesin tus basisi.
 */
const KEYBOARD_ROWS = [
  "qwertyuıopğü",
  "asdfghjklşi",
  "zxcvbnmöç",
];

function maxKeyboardRowRun(text: string): number {
  const lower = text.toLocaleLowerCase("tr-TR");
  let overall = 0;
  for (const row of KEYBOARD_ROWS) {
    let current = 0;
    for (const ch of lower) {
      if (row.includes(ch)) {
        current++;
        if (current > overall) overall = current;
      } else {
        current = 0;
      }
    }
  }
  return overall;
}

export function looksLikeGibberish(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return false; // cok kisa — baska katmanlar zaten ele aliyor

  const ratio = vowelRatio(trimmed);
  const maxRun = maxConsonantRun(trimmed);

  // Hic sesli harf yok → "ksdf" gibi
  if (ratio === 0) return true;
  // Cok dusuk sesli orani → "hgdsghsdghdsü" gibi
  if (ratio < 0.15) return true;
  // Imkansiz uzun sessiz dizi → "jklmnpqr" gibi
  if (maxRun >= 5) return true;
  // Tek klavye satirinda 5+ ardisik harf → "qwertyu", "asdfgh" gibi
  if (maxKeyboardRowRun(trimmed) >= 5) return true;

  return false;
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
  if (QUESTION_STARTERS.some((s) => t.startsWith(s))) return true;
  if (QUESTION_INFIX_KEYWORDS.some((kw) => t.includes(kw))) return true;
  if (IDENTITY_QUESTION_PATTERNS.some((re) => re.test(t))) return true;
  return false;
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
  if (looksLikeGibberish(trimmed)) {
    return {
      ok: false,
      reason: "junk",
      error:
        "Adınızı tam yazar mısınız? Satış ekibimizin size doğru hitap edebilmesi için.",
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
  if (looksLikeGibberish(trimmed)) {
    return {
      ok: false,
      reason: "junk",
      error:
        "Şirket adınızı doğru kaydedebilmemiz için tam yazar mısınız? Bağımsız çalışıyorsanız 'Bireysel' yeterli.",
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
  if (looksLikeGibberish(trimmed)) {
    return {
      ok: false,
      reason: "junk",
      error: "Aracın adını yazar mısınız? Örnek: 'Shopify Analytics', 'Excel'.",
    };
  }

  const r = currentToolSchema.safeParse(trimmed);
  if (!r.success) {
    return { ok: false, reason: "format", error: "Lütfen kısa bir açıklama yazın." };
  }
  return { ok: true, value: r.data };
}
