/**
 * Konusma state machine'i.
 *
 * Her step icin handleUserInput cagrildiginda 4 sonuctan biri donulur:
 *   - advance: Veri valid, sonraki step'e gec
 *   - clarify: Validasyon hatasi, ayni step'te kal + bota soyletecek mesaj
 *   - branch:  Ozel bir sub-step'e (ornek: kisisel email confirm) atla
 *   - submit:  Akis sonu — lead'i gonder
 */
import type { Intent, Timeline, Volume } from "@/types/lead";
import { botMessageForStep } from "./scripts";
import type { BotMessage } from "./scripts";
import {
  parseCompany,
  parseCurrentTool,
  parseEmail,
  parseName,
} from "./validation";
import type { ConversationState, LeadData, QuickReply, Step, UIMessage } from "./types";

export const SCHEMA_VERSION = 1;

const VALID_INTENTS: Intent[] = ["demo", "pricing", "integration", "support", "other"];
const VALID_VOLUMES: Volume[] = ["<500", "500-5k", "5k-50k", "50k+"];
const VALID_TIMELINES: Timeline[] = ["this-week", "this-month", "this-quarter", "researching"];

function isIntent(value: string | undefined): value is Intent {
  return !!value && (VALID_INTENTS as string[]).includes(value);
}
function isVolume(value: string | undefined): value is Volume {
  return !!value && (VALID_VOLUMES as string[]).includes(value);
}
function isTimeline(value: string | undefined): value is Timeline {
  return !!value && (VALID_TIMELINES as string[]).includes(value);
}

export type StepResult =
  | { kind: "advance"; nextStep: Step; updates: Partial<LeadData> }
  | { kind: "branch"; nextStep: Step; updates: Partial<LeadData> }
  | { kind: "clarify"; botMessage: string }
  | { kind: "submit"; updates: Partial<LeadData> }
  | { kind: "fallback" };

export interface UserInput {
  text: string;
  /** Quick reply tiklandiysa payload bilgisi. */
  payload?: string;
}

/** Belirli bir step + kullanici input'u icin sonraki durumu hesaplar. */
export function handleUserInput(step: Step, input: UserInput): StepResult {
  switch (step) {
    case "greeting": {
      // Quick reply ise direkt intent. Serbest metinde intent bilinmiyor — other yaz.
      const intent: Intent = isIntent(input.payload) ? input.payload : "other";
      return { kind: "advance", nextStep: "identity_name", updates: { intent } };
    }

    case "identity_name": {
      if (looksLikeQuestion(input.text)) return { kind: "fallback" };
      const parsed = parseName(input.text);
      if (!parsed.ok) {
        return {
          kind: "clarify",
          botMessage:
            "Anladim 🙏 Talebinizi kaydedebilmem icin sadece kisa bir tanitim yeterli, isminizi paylasir misiniz?",
        };
      }
      return { kind: "advance", nextStep: "identity_company", updates: { name: parsed.value } };
    }

    case "identity_company": {
      if (looksLikeQuestion(input.text)) return { kind: "fallback" };
      const parsed = parseCompany(input.text);
      if (!parsed.ok) {
        return {
          kind: "clarify",
          botMessage:
            "Sirket adini kisaca yazabilir misiniz? (Tek kelime de olur)",
        };
      }
      return { kind: "advance", nextStep: "identity_email", updates: { company: parsed.value } };
    }

    case "identity_email": {
      const parsed = parseEmail(input.text);
      if (!parsed.ok) {
        return {
          kind: "clarify",
          botMessage: parsed.error,
        };
      }
      const { email, isPersonal } = parsed.value;
      if (isPersonal) {
        return {
          kind: "branch",
          nextStep: "identity_email_confirm_personal",
          updates: { email, emailIsPersonal: true },
        };
      }
      return {
        kind: "advance",
        nextStep: "qualification_volume",
        updates: { email, emailIsPersonal: false },
      };
    }

    case "identity_email_confirm_personal": {
      if (input.payload === "__keep__") {
        return { kind: "advance", nextStep: "qualification_volume", updates: {} };
      }
      if (input.payload === "__retry__") {
        return { kind: "branch", nextStep: "identity_email", updates: { email: undefined } };
      }
      // Serbest metinse: yeni email mi yazdi diye dene
      const parsed = parseEmail(input.text);
      if (parsed.ok) {
        const { email, isPersonal } = parsed.value;
        if (!isPersonal) {
          return {
            kind: "advance",
            nextStep: "qualification_volume",
            updates: { email, emailIsPersonal: false },
          };
        }
        return {
          kind: "clarify",
          botMessage:
            "Bu da kisisel bir adres gibi gorunuyor. Sirket e-postaniz var mi? Yoksa az onceki adresle devam edelim.",
        };
      }
      return {
        kind: "clarify",
        botMessage: "Anlayamadim — devam mi edelim, yoksa baska bir e-posta mi yazacaksiniz?",
      };
    }

    case "qualification_volume": {
      if (isVolume(input.payload)) {
        return {
          kind: "advance",
          nextStep: "qualification_tool",
          updates: { volume: input.payload },
        };
      }
      // Quick reply yerine serbest metin: parse etmeyi deneyelim
      const guess = guessVolume(input.text);
      if (guess) {
        return { kind: "advance", nextStep: "qualification_tool", updates: { volume: guess } };
      }
      return {
        kind: "clarify",
        botMessage:
          "Asagidaki secenekler arasindan size en yakin olani isaretler misiniz?",
      };
    }

    case "qualification_tool": {
      if (input.payload === "__none__") {
        return {
          kind: "advance",
          nextStep: "timeline",
          updates: { currentTool: "Henuz bir arac kullanilmiyor" },
        };
      }
      if (looksLikeQuestion(input.text)) return { kind: "fallback" };
      const parsed = parseCurrentTool(input.text);
      if (!parsed.ok) {
        return { kind: "clarify", botMessage: parsed.error };
      }
      return { kind: "advance", nextStep: "timeline", updates: { currentTool: parsed.value } };
    }

    case "timeline": {
      if (input.payload === "__skip__") {
        return { kind: "advance", nextStep: "summary", updates: { timeline: null } };
      }
      if (isTimeline(input.payload)) {
        return { kind: "advance", nextStep: "summary", updates: { timeline: input.payload } };
      }
      return {
        kind: "clarify",
        botMessage: "Asagidaki secenekler isinizi kolaylastirir, birini secebilirsiniz.",
      };
    }

    case "summary": {
      if (input.payload === "__confirm__") {
        return { kind: "submit", updates: {} };
      }
      if (input.payload === "__edit__") {
        // Faz 1 kapsaminda basit tutuyoruz — edit akisi henuz yok.
        return {
          kind: "clarify",
          botMessage:
            "Hangi bilgiyi guncellemek istersiniz? Su an icin yeniden baslamak en kolayi — sayfayi yenileyebilirsiniz.",
        };
      }
      return {
        kind: "clarify",
        botMessage: "Onayliyor musunuz? 'Evet, gonder' butonuna basabilirsiniz.",
      };
    }

    case "submitted":
      return { kind: "fallback" };
  }
}

/**
 * Free-text step'lerde kullanici cevap yerine soru sorabilir
 * (ornek: identity_name'de "fiyat ne kadar?"). Bu durumlari yakalayip
 * Gemini'ye fallback edilmesini saglar.
 */
function looksLikeQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length === 0) return false;
  if (t.endsWith("?")) return true;
  // Tipik Turkce soru / fiyat-ile-baslayan kalip baslangiclari
  const starters = [
    "ne ", "ne kadar", "neden", "niye", "nasil", "nasıl",
    "kac ", "kaç ", "hangi ", "kim ", "kimle", "kime",
    "fiyat", "ucret", "ücret", "maliyet", "demo ",
    "support", "destek", "entegrasyon",
  ];
  return starters.some((s) => t.startsWith(s));
}

function guessVolume(text: string): Volume | undefined {
  const t = text.toLowerCase();
  if (/(50\.?000|50k|elli\s?bin)\+?/.test(t) || /(yuz\s?bin|100k|100\.?000)/.test(t)) return "50k+";
  if (/(5\.?000\s?-\s?50\.?000|5k\s?-\s?50k)/.test(t)) return "5k-50k";
  if (/(500\s?-\s?5\.?000|500\s?-\s?5k)/.test(t)) return "500-5k";
  if (/<\s?500|500'?den\s?az/.test(t)) return "<500";
  return undefined;
}

/** Yeni konusma baslangici. */
export function createInitialState(): ConversationState {
  const now = new Date().toISOString();
  const greeting = botMessageForStep("greeting", {});
  const firstMessage: UIMessage = {
    id: makeId(),
    role: "assistant",
    content: greeting.content,
    quickReplies: greeting.quickReplies,
    timestamp: now,
  };
  return {
    version: SCHEMA_VERSION,
    step: "greeting",
    messages: [firstMessage],
    leadData: {},
    startedAt: now,
    lastActivityAt: now,
  };
}

/** Yeni asistan mesaji olustur. */
export function buildBotUIMessage(step: Step, lead: LeadData): UIMessage {
  const msg: BotMessage = botMessageForStep(step, lead);
  return {
    id: makeId(),
    role: "assistant",
    content: msg.content,
    quickReplies: msg.quickReplies,
    timestamp: new Date().toISOString(),
  };
}

/** Kullanici mesaji olustur. */
export function buildUserUIMessage(content: string): UIMessage {
  return {
    id: makeId(),
    role: "user",
    content,
    timestamp: new Date().toISOString(),
  };
}

/** Clarify durumunda quick reply'lari korumak icin: ayni step icin tekrar quick replies uretir. */
export function quickRepliesForStep(step: Step, lead: LeadData): QuickReply[] | undefined {
  return botMessageForStep(step, lead).quickReplies;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
