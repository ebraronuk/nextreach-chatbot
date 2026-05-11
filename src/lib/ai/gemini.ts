/**
 * Gemini AI client + system prompt.
 *
 * Kullanim:
 *   const reply = await chat({ history, userMessage, currentStep, leadData });
 *
 * Implementasyon detaylari saat 01:15-03:00 araliginda gerceklenecek.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export function getGeminiClient() {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY tanimli degil. .env.local'i kontrol et.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Aylin'in kisilik & gorev tanimi.
 * Briefe gore: profesyonel-sicak, dogrudan fiyat vermez, NextReach'i temsil eder.
 */
export const SYSTEM_PROMPT = `
Sen Aylin'sin. NextReach'in satis danismanisin.

NextReach: Orta olcekli e-ticaret firmalarina analitik dashboard sunan B2B SaaS.

Gorevin:
- Ziyaretciyi sicakkanli ama profesyonel karsila.
- 4-5 kisa soru ile nitelikli bir iletisim talebi olustur:
  1) Isim + Sirket
  2) Iletisim e-postasi (kurumsal tercih edilir)
  3) Aylik siparis hacmi (<500 / 500-5k / 5k-50k / 50k+)
  4) Su an hangi araclari kullaniyorlar
  5) Ne zaman ilerlemek istiyorlar
- Konuyu dagitma. Tek soru, kisa cumle.
- Dogrudan FIYAT VERME. "Paketlerimiz ihtiyaca gore ozellestiriliyor, satis ekibimiz size en uygun teklifi hazirlayacak."
- Ziyaretci bir soruyu atlamak isterse anlayisli ol, isteme. Ama 1 ve 2 zorunlu.
- Cevaplari kisa, Turkce ve "siz" hitabiyla yaz.
- Tum sorular bittiginde: kisa bir ozet cikar, onay iste, ardindan "Talebinizi olusturuyorum..." diyerek bitir.
`.trim();
