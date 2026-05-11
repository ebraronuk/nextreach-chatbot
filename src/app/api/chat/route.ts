/**
 * POST /api/chat
 *
 * Chatbot off-script fallback'i. Client'taki state machine kullaniciyi normal
 * akista tutar; ancak kullanici "anlasilmayan" bir sey yazarsa (fiyat sorma,
 * teknik soru, konu disi sohbet), client buraya post atip Gemini'den streaming
 * cevap aliyor.
 *
 * Body sema:
 *   {
 *     history: [{role: 'user'|'assistant', content: string}],
 *     userMessage: string,
 *     step: Step,
 *     leadData: Partial<LeadData>
 *   }
 *
 * Donus: text/plain streaming (her chunk = ham metin parcasi).
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGeminiClient } from "@/lib/ai/gemini";

export const runtime = "edge";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

const bodySchema = z.object({
  history: z.array(messageSchema).max(50),
  userMessage: z.string().min(1).max(2000),
  step: z.string().max(64),
  leadData: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { history, userMessage, step, leadData } = parsed.data;

  let model;
  try {
    model = getGeminiClient({
      systemInstruction: buildStepGuidance(step, leadData ?? {}),
    });
  } catch (err) {
    console.error("[api/chat] Gemini client init failed:", err);
    return NextResponse.json(
      { error: "AI servisi su an kullanilamiyor." },
      { status: 503 },
    );
  }

  // Gemini history: 'assistant' -> 'model'. Ilk mesaj 'user' olmali — assistant ile basliyorsa kirp.
  const trimmedHistory = trimLeadingAssistant(history);
  const geminiHistory = trimmedHistory.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let resultStream;
  try {
    const chat = model.startChat({ history: geminiHistory });
    const sent = await chat.sendMessageStream(userMessage);
    resultStream = sent.stream;
  } catch (err) {
    console.error("[api/chat] Gemini call failed:", err);
    return NextResponse.json(
      { error: "AI cevabi alinamadi, tekrar dener misiniz?" },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of resultStream) {
          const text = chunk.text();
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        console.error("[api/chat] stream error:", err);
        controller.error(err);
        return;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

function trimLeadingAssistant(
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Array<{ role: "user" | "assistant"; content: string }> {
  let i = 0;
  while (i < history.length && history[i].role === "assistant") i++;
  return history.slice(i);
}

function buildStepGuidance(step: string, lead: Record<string, unknown>): string {
  const ctx = JSON.stringify(lead);
  switch (step) {
    case "greeting":
      return `Konusma yeni basliyor. Kullaniciyi karsila ve niyetini ogrenmeye calis. Toplanan veri: ${ctx}`;
    case "identity_name":
      return `Henuz isim alinmadi. Kullanicinin yazdigi serbest metni isim olarak yorumla; degilse nazikce isim sor. Toplanan veri: ${ctx}`;
    case "identity_company":
      return `Isim alindi (${(lead as { name?: string }).name ?? "—"}). Sirket adini almaliyiz. Toplanan veri: ${ctx}`;
    case "identity_email":
    case "identity_email_confirm_personal":
      return `Is e-postasini almaliyiz. Kisisel e-posta gelirse kurumsal teklif et ama zorlama. Toplanan veri: ${ctx}`;
    case "qualification_volume":
      return `Aylik siparis hacmini almaliyiz. Asagidaki bantlar: <500, 500-5k, 5k-50k, 50k+. Toplanan veri: ${ctx}`;
    case "qualification_tool":
      return `Su an kullandigi arac/cozumu ogrenmeliyiz. Serbest metin kabul. Toplanan veri: ${ctx}`;
    case "timeline":
      return `Ne zaman ilerlemek istedigini sor (opsiyonel; atlanabilir). Toplanan veri: ${ctx}`;
    case "summary":
      return `Tum bilgiler topland. Ozetle ve onay iste. Toplanan veri: ${ctx}`;
    case "submitted":
      return `Talep gonderildi. Ekibin 24 saat icinde donus yapacagini hatirlat. Toplanan veri: ${ctx}`;
    default:
      return `Toplanan veri: ${ctx}`;
  }
}
