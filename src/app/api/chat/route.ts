/**
 * POST /api/chat
 * Chatbot konusma endpoint'i.
 *
 * Akis:
 *   1. Body validation (Zod)
 *   2. Rate limit kontrolu (IP basina)
 *   3. Gemini'ye konusma gecmisi + system prompt gonder
 *   4. Streaming response dondur (kullanici hizli his etsin)
 *
 * Saat 01:15-03:00 araliginda gerceklenecek.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  // TODO: implement
  return NextResponse.json(
    { ok: false, message: "Chat endpoint henuz implement edilmedi." },
    { status: 501 },
  );
}
