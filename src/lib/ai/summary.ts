/**
 * Lead AI ozeti.
 *
 * Lead Supabase'e yazildiktan sonra async olarak cagrilir.
 * Hatasi lead kaydetmeyi bloklamamali.
 *
 * Cikti: 2 cumlelik Turkce ozet ("bu kisi kim, neden burada, neden simdi").
 * Gemini cagri basarisiz olursa null doner; caller `ai_summary`'i guncellemez.
 *
 * gemini.ts'in chat fonksiyonundan bagimsiz; sadece getGeminiClient() reuse eder.
 */
import type { ChatMessage, Intent, Timeline, Volume } from "@/types/lead";
import { getGeminiClient } from "./gemini";

export interface SummaryInput {
  name: string;
  company: string;
  email: string;
  intent?: Intent;
  volume?: Volume;
  currentTool?: string;
  timeline?: Timeline;
  transcript: ChatMessage[];
}

const INTENT_LABEL: Record<Intent, string> = {
  demo: "demo görmek istiyor",
  pricing: "fiyat bilgisi istiyor",
  integration: "entegrasyon soruyor",
  support: "destek arıyor",
  other: "diğer",
};

const TIMELINE_LABEL: Record<Timeline, string> = {
  "this-week": "bu hafta ilerlemek istiyor",
  "this-month": "bu ay ilerlemek istiyor",
  "this-quarter": "bu çeyrekte ilerlemek istiyor",
  researching: "şimdilik araştırıyor",
};

function buildPrompt(input: SummaryInput): string {
  const transcriptText = input.transcript
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "user" ? "Ziyaretçi" : "Aylin"}: ${m.content}`)
    .join("\n");

  return [
    "Aşağıda bir B2B SaaS satış chatbotuyla yapılmış konuşma var.",
    "NextReach satış ekibi için TÜRKÇE, en fazla 2 cümlelik bir özet yaz.",
    "",
    "Kurallar:",
    "- 'Bu kişi kim, neden burada, neden şimdi?' sorusunu cevapla.",
    "- İsmiyle bahset; 'kullanıcı', 'ziyaretçi' gibi etiketler kullanma.",
    "- Fiyat verme, tahmin yapma, üstüne yorum ekleme.",
    "- Markdown, başlık veya madde kullanma; düz iki cümle yeter.",
    "",
    "LEAD KARTI",
    `- İsim: ${input.name}`,
    `- Şirket: ${input.company}`,
    `- E-posta: ${input.email}`,
    `- Niyet: ${input.intent ? INTENT_LABEL[input.intent] : "belirsiz"}`,
    `- Aylık hacim: ${input.volume ?? "belirsiz"}`,
    `- Şu anki çözüm: ${input.currentTool ?? "belirsiz"}`,
    `- Zaman: ${input.timeline ? TIMELINE_LABEL[input.timeline] : "belirsiz"}`,
    "",
    "KONUŞMA TRANSKRİPTİ",
    transcriptText || "(konuşma boş)",
  ].join("\n");
}

export async function summarizeLead(input: SummaryInput): Promise<string | null> {
  try {
    const model = getGeminiClient();
    const prompt = buildPrompt(input);

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    if (!text) return null;
    return truncateAtSentence(text, 600);
  } catch (err) {
    console.error("[summarizeLead] failed", err);
    return null;
  }
}

/**
 * Hard limit'i asarsa, cumle sonunda (`.` / `!` / `?`) kes — ortada degil.
 * En kotu durumda yumusak ellipsis ile bitir.
 */
function truncateAtSentence(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastEnd = Math.max(
    cut.lastIndexOf("."),
    cut.lastIndexOf("!"),
    cut.lastIndexOf("?"),
  );
  // Kesim noktasi makul uzaklikta degilse (cok erken cumle bitisi) ellipsis.
  if (lastEnd > max * 0.5) return cut.slice(0, lastEnd + 1);
  return cut.trim() + "…";
}
