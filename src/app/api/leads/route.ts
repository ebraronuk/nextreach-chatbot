/**
 * POST /api/leads
 * Konusma bittiginde lead'i Supabase'e kaydeder.
 *
 * Akis:
 *   1. Body validation (Zod)
 *   2. Spam kontrolleri (honeypot, minimum sure, rate limit)
 *   3. Lead scoring hesapla
 *   4. Supabase'e yaz (service_role key ile, RLS bypass)
 *   5. Skor >= 80 ise HOT_LEAD_WEBHOOK_URL'ye POST
 *   6. Cevap don
 *
 * Saat 03:00-03:45 araliginda gerceklenecek.
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // TODO: implement
  return NextResponse.json(
    { ok: false, message: "Leads endpoint henuz implement edilmedi." },
    { status: 501 },
  );
}

export async function GET(req: NextRequest) {
  // Admin sayfasi tarafindan kullanilacak.
  // ADMIN_SECRET_KEY ile dogrula.
  return NextResponse.json(
    { ok: false, message: "Leads listesi henuz implement edilmedi." },
    { status: 501 },
  );
}
