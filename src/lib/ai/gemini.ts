/**
 * Gemini AI client + system prompt.
 *
 * Tek export edilen fonksiyon: getGeminiClient(opts?).
 * route.ts opsiyonel `systemInstruction` ile step-aware ek talimat verebilir.
 *
 * SYSTEM_PROMPT, prompts/chatbot-system.md dosyasindan build-time'da inline
 * edilir (next.config.ts'teki webpack asset/source rule). Boylece prompt'u
 * urun ekibi koddan bagimsiz duzenleyebilir; hem Node hem Edge runtime'da
 * (fs olmadan) ayni string okunur.
 */
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { getServerEnv } from "@/lib/env";
import systemPromptRaw from "../../../prompts/chatbot-system.md";

interface ClientOptions {
  /** SYSTEM_PROMPT'a ek olarak iletilecek runtime talimat (step-aware guidance). */
  systemInstruction?: string;
}

export const SYSTEM_PROMPT = systemPromptRaw.trim();

export function getGeminiClient(opts: ClientOptions = {}): GenerativeModel {
  const env = getServerEnv();
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const fullSystem = opts.systemInstruction
    ? `${SYSTEM_PROMPT}\n\n--- DURUMA OZEL TALIMAT ---\n${opts.systemInstruction}`
    : SYSTEM_PROMPT;
  return genAI.getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction: fullSystem,
  });
}
