/**
 * Chatbot tamamlandiginda /api/leads'e POST atan kopru.
 *
 * Chatbot owner state machine'i yaziyor; bu helper iki dosyayi gevsek bagliyor:
 *   - Chatbot.tsx submit step'inde sadece `submitLead(...)` cagiriyor.
 *   - API contract (body sema, ad-uyumu, null/undefined coercion) burada.
 *
 * Lead kaydetme akisini bloklamamak icin fire-and-forget kullaniliyor: hata
 * varsa console'a log dusulup `success: false` donuyor — kullanici "Talebinizi
 * olusturduk" mesajini gormus oluyor (UX), backend log'larda gercek hata var.
 */
import { z } from "zod";
import type { LeadData } from "@/lib/conversation/types";
import type { ChatMessage } from "@/types/lead";

const ResponseSchema = z.object({
  ok: z.boolean().optional(),
  id: z.string().uuid().optional(),
  score: z.number().int().min(0).max(100).optional(),
  temperature: z.enum(["hot", "warm", "cold"]).optional(),
  message: z.string().optional(),
});

export interface SubmitLeadInput {
  leadData: LeadData;
  /** Konusma transkripti — id/quickReplies vs. extra alanlar API tarafinda strip ediliyor. */
  transcript: ChatMessage[];
  /** Konusma toplam suresi (sn). state.startedAt'ten hesapla. */
  conversationDurationSec: number;
  /** Honeypot field varsa. Bot doldurursa string gelir; insan icin bos. */
  honeypot?: string;
}

export interface SubmitLeadResult {
  success: boolean;
  id?: string;
  score?: number;
  temperature?: "hot" | "warm" | "cold";
  /** Backend'in dondugu kullanici-yonelimli TR mesaj (varsa). */
  message?: string;
}

export async function submitLead(input: SubmitLeadInput): Promise<SubmitLeadResult> {
  // LeadData -> API body donusumu.
  // - emailIsPersonal chatbot-icindir, API'ye gitmez.
  // - timeline null/undefined -> undefined (API tarafi nullable ama temiz tutuyoruz).
  const body = {
    name: input.leadData.name ?? "",
    company: input.leadData.company ?? "",
    email: input.leadData.email ?? "",
    intent: input.leadData.intent,
    volume: input.leadData.volume,
    currentTool: input.leadData.currentTool,
    timeline: input.leadData.timeline ?? undefined,
    transcript: input.transcript,
    conversationDurationSec: input.conversationDurationSec,
    honeypot: input.honeypot ?? "",
  };

  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const raw = await res.json().catch(() => null);
    // Backend semasinda silent degisiklik olursa caller sessizce NaN almasin —
    // Zod ile runtime parse.
    const parsed = ResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(
        "[submitLead] backend response schema mismatch",
        res.status,
        parsed.error.flatten(),
      );
      return { success: false };
    }
    const json = parsed.data;

    if (!res.ok || json.ok === false) {
      console.error("[submitLead] failed", res.status, json);
      return { success: false, message: json.message };
    }

    return {
      success: true,
      id: json.id,
      score: json.score,
      temperature: json.temperature,
    };
  } catch (err) {
    // Network hatasi vs. — kullaniciya "olustu" diyoruz, biz log'a yaziyoruz.
    console.error("[submitLead] network error", err);
    return { success: false };
  }
}
