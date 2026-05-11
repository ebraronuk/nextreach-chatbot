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
  | "submitted";

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
}
