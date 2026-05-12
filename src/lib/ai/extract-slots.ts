/**
 * Slot extraction — kullanicinin serbest metninden lead alanlarini cikarir.
 *
 * Tool loop hibrit yaklasimimizin AI tarafi:
 *   - Konusma akisini scripted state machine yonetiyor (deterministik, test edilebilir)
 *   - Kullanici off-script bir mesaj attiginda (soru, paragraf), bu fonksiyon
 *     mesajdan name/company/email/intent/volume/timeline alanlarini cikarir
 *   - Cikti Zod ile valide edilir — Gemini'nin "uydurma" alanlari reject olur
 *   - State machine cikan alanlari merge eder, dolu olan step'leri atlar
 *
 * Bu sekilde "Merhaba ben Ahmet, Acme'den, demo gormek istiyorum" cumlesi
 * tek mesajda 3 slot doldurur; bot iki ekstra step sormaz.
 *
 * Maliyet: her off-script turda 1 ekstra Gemini call. Streaming degil, 200-400ms.
 * Her mesaja LLM koymadigimiz icin maliyet sinirli; sadece kullanici scripted
 * yolun disina cikinca devreye giriyor.
 */
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";

const SlotsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  company: z.string().trim().min(1).max(200).optional(),
  email: z.string().email().max(160).optional(),
  intent: z.enum(["demo", "pricing", "integration", "support", "other"]).optional(),
  volume: z.enum(["<500", "500-5k", "5k-50k", "50k+"]).optional(),
  timeline: z
    .enum(["this-week", "this-month", "this-quarter", "researching"])
    .optional(),
  currentTool: z.string().trim().min(1).max(200).optional(),
});

export type ExtractedSlots = z.infer<typeof SlotsSchema>;

const SLOT_EXTRACTION_INSTRUCTION = `
Sen bir lead-form asistaninin yardimcisisin. Kullanici mesajindan strukturel
bilgi cikartiyorsun. ASLA bilgi uretme — sadece kullanicinin acikca veya
makul bicimde paylastigi alanlari dondur.

Bilinmeyen alani BOŞ BIRAK (key'i hic yazma). Tahmin yapma. Cumlenin
icinde gercekten gectigine emin olduklarini yaz.

ALAN tanimlari:
- name: kisinin adi (ornek: "Ahmet", "Ayse Kaya"). "Ben Ahmet" → "Ahmet".
- company: sirket adi (ornek: "Acme", "Mor Botanik"). "Acme'den" → "Acme".
- email: gecerli email formati.
- intent: kullanicinin amaci. "demo" / "pricing" / "integration" / "support" / "other".
  "demo gormek istiyorum" → "demo"; "fiyat soracaktim" → "pricing".
- volume: aylik siparis hacmi.
  "<500" / "500-5k" / "5k-50k" / "50k+".
  "ayda 5 bin siparis" → "5k-50k". "yaklasik 30 bin" → "5k-50k". "100 bin+" → "50k+".
- timeline: ne zaman baslamak istediği.
  "this-week" / "this-month" / "this-quarter" / "researching".
  "bu hafta" → "this-week"; "henuz arastiriyorum" → "researching".
- currentTool: kullandiklari arac. "Shopify Analytics", "Excel", "Tableau" gibi.

Cevabini SADECE JSON olarak ver. Aciklama yazma.
`.trim();

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    name: { type: SchemaType.STRING, nullable: true },
    company: { type: SchemaType.STRING, nullable: true },
    email: { type: SchemaType.STRING, nullable: true },
    intent: {
      type: SchemaType.STRING,
      enum: ["demo", "pricing", "integration", "support", "other"],
      nullable: true,
    },
    volume: {
      type: SchemaType.STRING,
      enum: ["<500", "500-5k", "5k-50k", "50k+"],
      nullable: true,
    },
    timeline: {
      type: SchemaType.STRING,
      enum: ["this-week", "this-month", "this-quarter", "researching"],
      nullable: true,
    },
    currentTool: { type: SchemaType.STRING, nullable: true },
  },
};

export interface ExtractSlotsInput {
  userMessage: string;
  /** Kullanici daha onceden hangi alanlari verdi — bunlari yeniden cikarsin diye degil, baglam icin. */
  alreadyFilled?: Partial<ExtractedSlots>;
}

/**
 * Gemini'den slot cikarir. Hata olursa bos obje doner (fail-safe — UI bloklanmaz).
 */
export async function extractSlots(
  input: ExtractSlotsInput,
): Promise<ExtractedSlots> {
  const env = getServerEnv();

  const filledHint = input.alreadyFilled
    ? Object.entries(input.alreadyFilled)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join("\n")
    : "";

  const userPrompt = `
Mevcut dolu alanlar (bunlari yeniden cikarmana gerek yok):
${filledHint || "  (hicbiri)"}

Yeni kullanici mesaji:
"""
${input.userMessage}
"""

Bu mesajdan cikarilabilen alanlari JSON olarak dondur.
`.trim();

  try {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: env.GEMINI_MODEL,
      systemInstruction: SLOT_EXTRACTION_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
        maxOutputTokens: 256,
      },
    });

    const result = await model.generateContent(userPrompt);
    const text = result.response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.warn("[extract-slots] JSON parse failed", { text });
      return {};
    }

    // Gemini bazen null degerleri "null" string'i olarak dondurur — temizle
    if (parsed && typeof parsed === "object") {
      for (const k of Object.keys(parsed as Record<string, unknown>)) {
        const v = (parsed as Record<string, unknown>)[k];
        if (v === null || v === "null" || v === "") {
          delete (parsed as Record<string, unknown>)[k];
        }
      }
    }

    const validated = SlotsSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn("[extract-slots] zod validation failed", validated.error.flatten());
      return {};
    }
    return validated.data;
  } catch (err) {
    console.error("[extract-slots] gemini call failed", err);
    return {};
  }
}
