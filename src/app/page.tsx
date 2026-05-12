/**
 * Landing page.
 *
 * Bileşenler:
 *   - Header     : sticky minimal nav (CTA + logo)
 *   - Hero       : eyebrow + başlık + 2 CTA + mock dashboard
 *   - SocialProof: 4 stat (300+ marka vb.)
 *   - Features   : bento grid 3 + 1 entegrasyon kartı
 *   - Footer
 *
 * Chatbot floating CTA Chatbot komponenti tarafından kendi kendine render edilir.
 * Hero ve Header'daki "Bize Ulaşın" butonları openChatbot helper'i ile aynı modal'i açar
 * (DOM köprüsü — Chatbot.tsx dosyasına dokunulmadı).
 */
import { Chatbot } from "@/components/chatbot/Chatbot";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { Features } from "@/components/landing/Features";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white text-slate-900">
        <Hero />
        <SocialProof />
        <Features />
        <FAQ />
      </main>
      <Footer />

      {/* Chatbot kendi floating CTA'sini ve modal'ini render eder */}
      <Chatbot />
    </>
  );
}
