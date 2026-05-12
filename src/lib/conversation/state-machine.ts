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
  isDismissive,
  isPureGreeting,
  looksLikeQuestion,
  parseCompany,
  parseCurrentTool,
  parseEmail,
  parseName,
} from "./validation";
import type { ConversationState, LeadData, QuickReply, Step, UIMessage } from "./types";
import { PAYLOAD } from "./payloads";

export const SCHEMA_VERSION = 2;

/**
 * Ayni step'te kac kere clarify dondurursek soft_abandoned'e gecelim.
 *  - 0. deneme (ilk yanlis): yumusak clarify
 *  - 1. deneme (ikinci yanlis): yumusak clarify (varied)
 *  - 2. deneme (ucuncu yanlis): SOFT ABANDON — "hazir oldugunuzda buradayiz"
 */
export const MAX_CLARIFY_ATTEMPTS = 2;

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
  | { kind: "fallback" }
  /** Kullanici N. kez bos/random cevap verdi — Aylin yumusakca cikis sunuyor. */
  | { kind: "soft_abandon" }
  /** soft_abandoned step'inden manuel reset isteniyor. */
  | { kind: "reset" };

export interface UserInput {
  text: string;
  /** Quick reply tiklandiysa payload bilgisi. */
  payload?: string;
}

export interface HandleOptions {
  /**
   * Su anki step'te kac kez clarify dondurulmus. Caller (Chatbot.tsx) tutar
   * ve her clarify'da +1, advance/branch'da 0'a reset eder.
   * MAX_CLARIFY_ATTEMPTS'a ulasinca state machine clarify yerine soft_abandon doner.
   */
  clarifyAttempts?: number;
}

/** Belirli bir step + kullanici input'u icin sonraki durumu hesaplar. */
export function handleUserInput(
  step: Step,
  input: UserInput,
  opts: HandleOptions = {},
): StepResult {
  // Caller'in tuttugu clarify retry sayisi MAX'a ulasinca,
  // step machine clarify yerine soft_abandon sinyali verir — Chatbot.tsx
  // bu sinyali yakalayip soft_abandoned step'ine gecisi tetikler.
  const attempts = opts.clarifyAttempts ?? 0;
  const clarifyOrAbandon = (botMessage: string): StepResult =>
    attempts >= MAX_CLARIFY_ATTEMPTS
      ? { kind: "soft_abandon" }
      : { kind: "clarify", botMessage };

  switch (step) {
    case "greeting": {
      // 1) Quick reply ile intent geldi -> direkt advance
      if (isIntent(input.payload)) {
        return { kind: "advance", nextStep: "identity_name", updates: { intent: input.payload } };
      }
      // 2) Serbest metin: sadece selamlama mi? -> kullanicıyı niyet seçimine geri yonlendir
      if (isPureGreeting(input.text)) {
        return clarifyOrAbandon(
          "Merhaba 👋 Size nasıl yardımcı olabileceğimi anlamak için aşağıdaki seçeneklerden birini işaretler misiniz?",
        );
      }
      // 3) Argo / dismissive ("naber kız" gibi) — nazikçe redirect, niyet sor
      if (isDismissive(input.text)) {
        return clarifyOrAbandon(
          "Tanıştığımıza memnun oldum. Aşağıdaki seçeneklerden biriyle başlayalım mı?",
        );
      }
      // 4) Soru sorduysa -> Gemini fallback
      if (looksLikeQuestion(input.text)) {
        return { kind: "fallback" };
      }
      // 5) Anlamli metin ama niyet belli degil — "other" olarak ilerlet
      return {
        kind: "advance",
        nextStep: "identity_name",
        updates: { intent: "other" },
      };
    }

    case "identity_name": {
      if (looksLikeQuestion(input.text)) return { kind: "fallback" };
      if (isDismissive(input.text)) {
        return clarifyOrAbandon(
          "Bilgilerinizi saygıyla işliyoruz — sadece adınız yeterli, kısaca paylaşır mısınız?",
        );
      }
      const parsed = parseName(input.text);
      if (!parsed.ok) {
        // Refusal / junk / format hata mesajları validation.ts'den geliyor — daha duyarlı
        return clarifyOrAbandon(parsed.error);
      }
      return { kind: "advance", nextStep: "identity_company", updates: { name: parsed.value } };
    }

    case "identity_company": {
      if (looksLikeQuestion(input.text)) return { kind: "fallback" };
      if (isDismissive(input.text)) {
        return clarifyOrAbandon(
          "Tek kelime şirket adı yeterli — örnek: 'Acme' veya 'Bireysel'.",
        );
      }
      const parsed = parseCompany(input.text);
      if (!parsed.ok) {
        return clarifyOrAbandon(parsed.error);
      }
      return { kind: "advance", nextStep: "identity_email", updates: { company: parsed.value } };
    }

    case "identity_email": {
      const parsed = parseEmail(input.text);
      if (!parsed.ok) {
        return clarifyOrAbandon(parsed.error);
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
      if (input.payload === PAYLOAD.KEEP) {
        return { kind: "advance", nextStep: "qualification_volume", updates: {} };
      }
      if (input.payload === PAYLOAD.RETRY) {
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
        return clarifyOrAbandon(
          "Bu da kisisel bir adres gibi gorunuyor. Sirket e-postaniz var mi? Yoksa az onceki adresle devam edelim.",
        );
      }
      return clarifyOrAbandon(
        "Anlayamadim — devam mi edelim, yoksa baska bir e-posta mi yazacaksiniz?",
      );
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
      return clarifyOrAbandon(
        "Asagidaki secenekler arasindan size en yakin olani isaretler misiniz?",
      );
    }

    case "qualification_tool": {
      if (input.payload === PAYLOAD.NONE) {
        return {
          kind: "advance",
          nextStep: "timeline",
          updates: { currentTool: "Henuz bir arac kullanilmiyor" },
        };
      }
      if (looksLikeQuestion(input.text)) return { kind: "fallback" };
      const parsed = parseCurrentTool(input.text);
      if (!parsed.ok) {
        return clarifyOrAbandon(parsed.error);
      }
      return { kind: "advance", nextStep: "timeline", updates: { currentTool: parsed.value } };
    }

    case "timeline": {
      if (input.payload === PAYLOAD.SKIP) {
        return { kind: "advance", nextStep: "summary", updates: { timeline: null } };
      }
      if (isTimeline(input.payload)) {
        return { kind: "advance", nextStep: "summary", updates: { timeline: input.payload } };
      }
      return clarifyOrAbandon(
        "Asagidaki secenekler isinizi kolaylastirir, birini secebilirsiniz.",
      );
    }

    case "summary": {
      if (input.payload === PAYLOAD.CONFIRM) {
        return { kind: "submit", updates: {} };
      }
      if (input.payload === PAYLOAD.EDIT) {
        // Faz 1 kapsaminda basit tutuyoruz — edit akisi henuz yok.
        return clarifyOrAbandon(
          "Hangi bilgiyi guncellemek istersiniz? Su an icin yeniden baslamak en kolayi — sayfayi yenileyebilirsiniz.",
        );
      }
      return clarifyOrAbandon(
        "Onayliyor musunuz? 'Evet, gonder' butonuna basabilirsiniz.",
      );
    }

    case "submitted":
      return { kind: "fallback" };

    case "soft_abandoned": {
      // Bu step'ten tek cikis: kullanicinin manuel reset istemesi.
      if (input.payload === PAYLOAD.RESET) {
        return { kind: "reset" };
      }
      // Diger input'lar: ayni mesaji + reset butonu tekrar gosterilir.
      return {
        kind: "clarify",
        botMessage:
          "Hazır olduğunuzda 'Yeni sohbet başlat' butonuyla devam edebiliriz 🙏",
      };
    }
  }
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
    clarifyAttempts: 0,
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

/**
 * Step -> hangi leadData alani dolarsa "tamamlandi" sayilir eslestirmesi.
 * Slot extraction sonrasi auto-advance icin kullaniliyor; null olanlar dallanma
 * veya ozet stepleri (otomatik atlanamaz).
 */
const STEP_FILLED_BY: Record<Step, keyof LeadData | null> = {
  greeting: "intent",
  identity_name: "name",
  identity_company: "company",
  identity_email: "email",
  identity_email_confirm_personal: null,
  qualification_volume: "volume",
  qualification_tool: "currentTool",
  timeline: "timeline",
  summary: null,
  submitted: null,
  soft_abandoned: null,
};

const STEP_ORDER: Step[] = [
  "greeting",
  "identity_name",
  "identity_company",
  "identity_email",
  "qualification_volume",
  "qualification_tool",
  "timeline",
  "summary",
];

/**
 * Verilen step'ten itibaren ilk "doldurulmamis" step'i bul.
 * Slot extraction sonrasi: name, company, intent zaten leadData'daysa,
 * direkt qualification_volume'a atla.
 */
export function findNextEmptyStep(fromStep: Step, lead: LeadData): Step {
  const startIdx = Math.max(0, STEP_ORDER.indexOf(fromStep));
  for (let i = startIdx; i < STEP_ORDER.length; i++) {
    const step = STEP_ORDER[i]!;
    const field = STEP_FILLED_BY[step];
    if (field === null) continue; // dallanma/ozet — atlanamaz
    const value = lead[field];
    if (value === undefined || value === null || value === "") return step;
  }
  return "summary";
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
