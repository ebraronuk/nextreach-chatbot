"use client";

/**
 * Chatbot ana komponenti.
 *
 * Yapi:
 *   - ChatbotTrigger  : Floating CTA buton (sag alt) veya landing CTA
 *   - ChatbotWindow   : Acilan modal/panel
 *   - ChatbotMessages : Mesaj listesi (kullanici + asistan)
 *   - ChatbotInput    : Input + gonder
 *
 * State:
 *   - messages: { role: "user" | "assistant"; content: string }[]
 *   - step: konusma asamasi (selamlama -> kimlik -> kalifikasyon -> ...)
 *   - leadData: toplanan veriler
 *   - isTyping: Gemini cevabi bekleniyor mu
 *
 * Saat 01:15-03:00 araliginda gerceklenecek.
 */
import { useState } from "react";

export function Chatbot() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 rounded-full bg-brand-600 px-5 py-3 text-white shadow-lg hover:bg-brand-700 transition"
        aria-label="Sohbeti baslat"
      >
        Bize Ulasin
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end p-4">
          <div className="w-full sm:w-[420px] h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col">
            <header className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-semibold">Aylin · NextReach</p>
                <p className="text-xs text-slate-500">Genelde 1 dakika icinde cevaplar</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Kapat"
              >
                X
              </button>
            </header>

            <div className="flex-1 overflow-y-auto chat-scroll p-4 text-sm text-slate-500">
              {/* Mesajlar buraya gelecek */}
              Chatbot icerigi henuz implement edilmedi.
            </div>

            <div className="p-4 border-t border-slate-200">
              {/* Input buraya gelecek */}
              <input
                type="text"
                placeholder="Mesajinizi yazin..."
                disabled
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
