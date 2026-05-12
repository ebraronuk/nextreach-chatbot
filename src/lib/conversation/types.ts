/**
 * Chatbot konusma motoru icin paylasilan tipler.
 * UI ve state machine bu tipler uzerinden konusur.
 */
import type { Intent, Timeline, Volume } from "@/types/lead";

export type Step =
  | "greeting"
  | "identity_name"
  | "identity_company"
  | "identity_email"
  | "identity_email_confirm_personal"
  | "qualification_volume"
  | "qualification_tool"
  | "timeline"
  | "summary"
  | "submitted"
  /**
   * Kullanici ayni step'te ust uste 3 kere anlamli cevap veremediginde
   * (random metin, ısrarla ret, junk vs.) ulasilan "soft exit".
   * Bot kibarca "hazır olduğunuzda buradayız" der; sadece "yeni sohbet
   * başlat" butonu ile cikilabilir.
   */
  | "soft_abandoned";

export interface LeadData {
  intent?: Intent;
  name?: string;
  company?: string;
  email?: string;
  emailIsPersonal?: boolean;
  volume?: Volume;
  currentTool?: string;
  timeline?: Timeline | null;
}

/** Chip butonu — tiklandiginda label kullanici mesaji olarak gorunur, value state'e yazilir. */
export interface QuickReply {
  label: string;
  /**
   * Kullanicinin "soylemis sayilmasi" gereken metin (mesaj balonunda goruntulenir).
   * label ile ayni olabilir.
   */
  echo: string;
  /** Yapisal payload (intent / volume / timeline / 'skip' gibi). */
  payload?: string;
}

export interface UIMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  /** ISO 8601. */
  timestamp: string;
  /** Sadece son asistan mesajinda dolu olmali. */
  quickReplies?: QuickReply[];
  /** Streaming sirasinda true; bittiginde false. */
  pending?: boolean;
}

export interface ConversationState {
  /** Sema versiyonu — localStorage'da eski formatlari ayiklamak icin. */
  version: number;
  step: Step;
  messages: UIMessage[];
  leadData: LeadData;
  /** Konusma basladigi an. */
  startedAt: string;
  /** Son aktivite — TTL hesaplamasi icin. */
  lastActivityAt: string;
  /**
   * Su anki step'te kac kez clarify dondurduk.
   * advance/branch olunca 0'a reset; >=2 olunca soft_abandoned'e gidiyoruz.
   */
  clarifyAttempts: number;
}
