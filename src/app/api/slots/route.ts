/**
 * POST /api/slots — kullanici mesajindan lead alanlarini cikarir.
 *
 * Hibrit tool-loop mimarisinin servis tarafi: state machine off-script bir
 * mesaja "fallback" karari verdiginde, client paralel olarak hem /api/chat
 * (streaming cevap) hem /api/slots (slot extraction) cagirir. /api/slots
 * geri donen alanlari client state'e merge eder, dolu olanlari state machine
 * sonraki turda atlar.
 *
 * Streaming yok — bu kucuk bir analitik call (~200-400ms, ~50 token).
 *
 * Honeypot, rate limit gibi guvenlik gates'leri burada YOK; ana giris noktasi
 * /api/leads, oradaki gates yeterli (slot extraction kotalanmis bir yardimcidir).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractSlots } from "@/lib/ai/extract-slots";

export const runtime = "nodejs";

const BodySchema = z.object({
  userMessage: z.string().min(1).max(2000),
  alreadyFilled: z
    .object({
      name: z.string().optional(),
      company: z.string().optional(),
      email: z.string().optional(),
      intent: z.string().optional(),
      volume: z.string().optional(),
      timeline: z.string().optional(),
      currentTool: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, slots: {} }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, slots: {} }, { status: 400 });
  }

  // alreadyFilled sadece "hint" — Zod-stricter validation slot extraction
  // tarafinda zaten yapilacak; burada loose string accept ediyoruz.
  const slots = await extractSlots({
    userMessage: parsed.data.userMessage,
    alreadyFilled: parsed.data.alreadyFilled as never,
  });

  return NextResponse.json({ ok: true, slots });
}
