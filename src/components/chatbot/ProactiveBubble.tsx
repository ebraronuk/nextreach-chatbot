"use client";

/**
 * Aylin'in proaktif davet baloncuğu.
 *
 * Pattern: Intercom / Drift'in "preview message" akışı.
 * Kullanıcı landing'e girince:
 *   - 4 saniye bekler (sayfa içeriği algılansın diye)
 *   - "Bize Ulaşın" butonunun üstünde Aylin'in avatarı + kısa davet metni belirir
 *   - Slide-up + fade-in animasyon
 *   - "Sohbeti başlat" tıklayınca chatbot açılır (openChatbot event)
 *   - X ile kapatılınca localStorage'a yazılır — aynı kullanıcıya bir daha çıkmaz
 *   - Mobil: gizli (FAB zaten görünür, ekranı kaplamasın)
 *
 * Erişilebilirlik:
 *   - aria-live polite (screen reader bildirir ama agresif değil)
 *   - Klavye odağı bubble'a çekilmez (görsel teaser, klavyeyle FAB zaten erişilebilir)
 *   - Close butonunda aria-label
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { openChatbot } from "../landing/openChatbot";
import { PROACTIVE_BUBBLE_DELAY_MS, STORAGE_KEYS } from "@/constants/chat";
import { track } from "@/lib/analytics";

const DISMISS_KEY = STORAGE_KEYS.proactiveBubbleDismissed;
const SHOW_DELAY_MS = PROACTIVE_BUBBLE_DELAY_MS;

export function ProactiveBubble() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Daha önce kapattıysa, gösterme. Safari private mode'da getItem da throw
    // atabilir; try/catch ile koruma.
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      /* Safari private mode — show as default */
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
      track("proactive_bubble_shown");
    }, SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  function handleDismiss(e?: React.MouseEvent) {
    e?.stopPropagation();
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage erişilemiyor olabilir — sessiz geç
    }
    track("proactive_bubble_dismissed");
  }

  function handleStart() {
    track("proactive_bubble_started_chat");
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    openChatbot();
  }

  if (dismissed || !visible) return null;

  return (
    <div
      className="hidden sm:flex fixed bottom-24 right-6 z-30 flex-col items-end pointer-events-none animate-fade-in-up"
      aria-live="polite"
    >
      <div className="pointer-events-auto max-w-[300px] rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        {/* Header — Aylin avatar + close */}
        <div className="flex items-start justify-between px-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-9 rounded-full bg-gradient-to-br from-brand-600 via-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-brand-500/30">
                A
              </div>
              {/* Online indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-400 ring-2 ring-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-tight">Aylin</p>
              <p className="text-[11px] text-slate-500">NextReach · şu an çevrimiçi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-700 transition rounded p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            aria-label="Bildirimi kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Message bubble */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-sm text-slate-700 leading-relaxed">
            Merhaba 👋 Birkaç sorunuz olabilir. NextReach&apos;in size nasıl
            yardımcı olabileceğini birlikte konuşalım mı?
          </p>
        </div>

        {/* CTA */}
        <div className="px-4 pb-4 pt-1">
          <button
            type="button"
            onClick={handleStart}
            className="w-full rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition shadow-md shadow-brand-500/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Sohbete başla →
          </button>
        </div>
      </div>

      {/* Pointer arrow toward FAB */}
      <div className="pointer-events-none mr-6 mt-1 h-3 w-3 rotate-45 bg-white ring-1 ring-slate-200 -translate-y-2" />
    </div>
  );
}
