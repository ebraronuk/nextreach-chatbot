/**
 * Landing page — placeholder.
 * Saat 04:45-05:15 araliginda gercek tasarim buraya gelecek:
 *   - Hero (NextReach pitch)
 *   - "Bize Ulasin" CTA -> Chatbot tetikler
 *   - Sosyal kanit (logos / istatistikler)
 *   - Footer
 */
import { Chatbot } from "@/components/chatbot/Chatbot";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">NextReach</h1>
        <p className="text-slate-600">
          Landing page burada olacak. Sag altta &quot;Bize Ulasin&quot; butonu
          chatbot iskeletini aciyor.
        </p>
        <p className="text-sm text-slate-400">
          (Bu placeholder, src/app/page.tsx icinde duzenlenecek.)
        </p>
      </div>

      {/* Chatbot floating CTA + modal. Asil mantik Faz 1'de gelecek. */}
      <Chatbot />
    </main>
  );
}
