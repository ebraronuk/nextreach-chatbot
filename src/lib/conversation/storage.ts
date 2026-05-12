/**
 * Konusma persistance — localStorage.
 * Refresh dirençli; 24 saat sonra eskimis konusmalar silinir.
 *
 * Anahtar `constants/chat.ts`'ten geliyor (single source of truth). Eski
 * key (`nextreach_conversation_v1`) hala disaridaki tarayicilarda olabilir;
 * 24 saat TTL'i icinde siliniyor zaten — yine de loadConversation grace
 * migration olarak eski key'i de kontrol edip yeni key'e tasiyor.
 */
import { STORAGE_KEYS } from "@/constants/chat";
import { SCHEMA_VERSION } from "./state-machine";
import type { ConversationState } from "./types";

const KEY = STORAGE_KEYS.conversation;
const LEGACY_KEY = "nextreach_conversation_v1";
const TTL_MS = 24 * 60 * 60 * 1000;

export function saveConversation(state: ConversationState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    // Quota dolu / private browsing — sessizce yutuyoruz, konusma yine bellekte calisiyor.
    console.warn("[chatbot] localStorage save failed:", err);
  }
}

export function loadConversation(): ConversationState | null {
  if (typeof window === "undefined") return null;
  try {
    // Grace migration: eski key varsa onu da kontrol et, varsa yeni key'e tasi.
    let raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        window.localStorage.setItem(KEY, legacy);
        window.localStorage.removeItem(LEGACY_KEY);
        raw = legacy;
      }
    }
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ConversationState>;
    if (parsed.version !== SCHEMA_VERSION) return null;
    if (!parsed.lastActivityAt) return null;
    const age = Date.now() - new Date(parsed.lastActivityAt).getTime();
    if (Number.isNaN(age) || age > TTL_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    if (!parsed.step || !Array.isArray(parsed.messages)) return null;
    return parsed as ConversationState;
  } catch (err) {
    console.warn("[chatbot] localStorage load failed:", err);
    return null;
  }
}

export function clearConversation(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* noop */
  }
}
