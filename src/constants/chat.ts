/**
 * Chatbot icin paylasilan sabit degerler.
 * Magic number'lari tek yerde toplamak: degisiklik kolay, A/B testi kolay.
 */

/** Asistanin "yaziyor" gostergesinin gosterilme suresi (ms). */
export const TYPING_DELAY_MS = 550;

/** Proaktif baloncuk landing'e girince kac ms sonra acilir. */
export const PROACTIVE_BUBBLE_DELAY_MS = 4000;

/** Localstorage key prefix'leri. */
export const STORAGE_KEYS = {
  conversation: "nextreach.chatbot.conversation.v1",
  proactiveBubbleDismissed: "nextreach.aylin.bubble.dismissed",
} as const;

/** Inactivity uyarisi (henuz aktif degil, ileride kullanilabilir). */
export const INACTIVITY_NUDGE_MS = 60_000;
export const INACTIVITY_ABANDON_MS = 180_000;
