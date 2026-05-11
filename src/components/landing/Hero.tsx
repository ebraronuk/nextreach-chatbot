"use client";

/**
 * Hero — landing'in ust kismi.
 * - Eyebrow + buyuk baslik + alt baslik + 2 CTA
 * - Sosyal kanit ribbon
 * - MockDashboard hero gorseli
 *
 * Birincil CTA chatbot'u aciyor (openChatbot helper'i ile, Chatbot.tsx'e dokunmadan).
 */
import { MessageCircle, PlayCircle } from "lucide-react";
import { MockDashboard } from "./MockDashboard";
import { openChatbot } from "./openChatbot";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Subtle radial accent */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(34,211,238,0.10),transparent_60%)]"
      />

      <div className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-10 md:pb-16 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
          <span className="size-1.5 rounded-full bg-brand-500 animate-pulse" />
          E-ticaret Analitik Platformu
        </p>

        <h1 className="mt-5 text-4xl md:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.05]">
          E-ticaretinizi{" "}
          <span className="bg-gradient-to-r from-brand-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
            veriyle büyüten
          </span>
          <br />
          dashboard.
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-slate-600 leading-relaxed">
          300+ marka; gerçek zamanlı sipariş, stok ve müşteri verilerini
          NextReach ile yönetiyor. Tek bir konuşmayla 24 saat içinde demoya
          başlayın.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={openChatbot}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <MessageCircle className="size-4" />
            Bize Ulaşın
          </button>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <PlayCircle className="size-4" />
            Daha fazla bilgi
          </a>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Kart bilgisi istemiyoruz · 5 dakikada kurulum · 14 gün ücretsiz
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto">
          <MockDashboard />
        </div>
      </div>
    </section>
  );
}
