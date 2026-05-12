"use client";

/**
 * Header — landing sayfasinin minimal navi.
 * Sticky, ferah, tek primary CTA. Tasarim notlari: docs/05-design-inspiration.md
 */
import { openChatbot } from "./openChatbot";

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2 group" aria-label="NextReach ana sayfa">
          <span className="size-7 rounded-lg bg-gradient-to-br from-brand-600 via-blue-500 to-cyan-400 shadow-md shadow-brand-500/30" />
          <span className="font-semibold tracking-tight text-slate-900">
            NextReach
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600">
          <a href="#features" className="hover:text-slate-900 transition">
            Özellikler
          </a>
          <a href="#stats" className="hover:text-slate-900 transition">
            Müşteriler
          </a>
          <a href="#faq" className="hover:text-slate-900 transition">
            SSS
          </a>
        </nav>

        <button
          type="button"
          onClick={openChatbot}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Demo Talep Et
        </button>
      </div>
    </header>
  );
}
