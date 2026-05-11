/**
 * Hero/Header CTA -> Chatbot acmak icin koprü.
 *
 * Chatbot komponentine dokunmadan, mevcut floating button'u DOM uzerinden
 * tetikliyoruz. aria-label design system'de stabil tutuldugu icin durable.
 *
 * Hala bulunamazsa custom event yayinliyoruz; chatbot ileride dinler hale
 * gelirse kosul-bagimsiz ayni cagri calisir.
 */
export function openChatbot(): void {
  if (typeof window === "undefined") return;

  // 1) Floating trigger button'i bul ve tikla
  const trigger = document.querySelector<HTMLButtonElement>(
    'button[aria-label*="sohbet" i]',
  );
  if (trigger) {
    trigger.click();
    return;
  }

  // 2) Fallback: custom event (chatbot ileride dinleyebilir)
  window.dispatchEvent(new CustomEvent("nextreach:open-chatbot"));
}
