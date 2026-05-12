"use client";

/**
 * useFocusTrap — modal/dialog icin a11y guvenlik aginin tek bir hook'a soyutlanmasi.
 *
 * Sorumluluklar:
 *   - active=true iken Tab ve Shift+Tab focus'u dialog icinde tutar
 *   - Escape tusu basinda onEscape() cagrilir
 *   - Acilis sirasinda preferredFocusSelector veya ilk focusable elemana focus verir
 *
 * Notlar:
 *   - dialogRef icindeki [tabindex="-1"] ve disabled olanlar focusable sayilmaz
 *   - offsetParent === null olanlar (hidden) sayilmaz
 *   - Hook ayri dosyada cunku Chatbot.tsx'in dort sorumluluga sahip bir component
 *     olmasini onlemek istedim; bu hook tek basina React Testing Library ile
 *     test edilebilir.
 */
import { useEffect, type RefObject } from "react";

interface UseFocusTrapOptions {
  /** Trap aktif mi? Genelde modal'in `open` state'i. */
  active: boolean;
  /** Trap edilen kapsayici. */
  containerRef: RefObject<HTMLElement | null>;
  /** Escape basildiginda cagrilir (ornek: setOpen(false)). */
  onEscape: () => void;
  /**
   * Acilis sirasinda focus edilecek elemanin selector'i. Bulunamazsa ilk
   * focusable kullanilir.
   */
  preferredFocusSelector?: string;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap({
  active,
  containerRef,
  onEscape,
  preferredFocusSelector,
}: UseFocusTrapOptions): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    function getFocusables(): HTMLElement[] {
      if (!container) return [];
      return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = getFocusables();
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (activeEl === first || !activeEl || !container?.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);

    // Acilistan kisa sure sonra focus — animasyon bitsin diye
    const focusTimer = setTimeout(() => {
      const node = containerRef.current;
      if (!node) return;
      const preferred = preferredFocusSelector
        ? node.querySelector<HTMLElement>(preferredFocusSelector)
        : null;
      (preferred ?? getFocusables()[0])?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(focusTimer);
    };
  }, [active, containerRef, onEscape, preferredFocusSelector]);
}
