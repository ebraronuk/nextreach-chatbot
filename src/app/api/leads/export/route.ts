/**
 * GET /api/leads/export?key=...&format=csv
 *
 * Admin icin lead'leri CSV (default) ya da JSON olarak indirir. Excel ve
 * Google Sheets dogrudan acabilir.
 *
 * - Yetki: admin secret key (ayni /api/leads?key=...)
 * - Filtreler: status, temperature, since (?status=new&temperature=hot)
 * - Format: ?format=csv | json
 *
 * UTF-8 BOM ekleniyor — Excel Turkce karakterleri (i, ş, ç, ğ) dogru gostersin.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { listLeads } from "@/lib/services/leads";
import type { LeadRow } from "@/lib/db/supabase";

export const runtime = "nodejs";

function isAdmin(req: NextRequest): boolean {
  const expected = getServerEnv().ADMIN_SECRET_KEY;
  const key = req.nextUrl.searchParams.get("key");
  return key === expected;
}

/**
 * CSV alan değerini kaçırarak güvenli hale getir.
 * Çift tırnaklar ikiye katlanır, içinde virgül/tırnak/yeni satır varsa
 * tüm değer çift tırnak içine alınır (RFC 4180).
 */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function leadsToCsv(leads: LeadRow[]): string {
  const headers = [
    "id",
    "created_at",
    "name",
    "company",
    "email",
    "phone",
    "intent",
    "volume",
    "current_tool",
    "timeline",
    "score",
    "temperature",
    "status",
    "ai_summary",
    "conversation_duration_sec",
  ];

  const rows = leads.map((l) =>
    [
      l.id,
      l.created_at,
      l.name,
      l.company,
      l.email,
      l.phone ?? "",
      l.intent ?? "",
      l.volume ?? "",
      l.current_tool ?? "",
      l.timeline ?? "",
      l.score,
      l.temperature,
      l.status,
      l.ai_summary ?? "",
      l.conversation_duration_sec ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );

  // UTF-8 BOM (﻿) — Excel TR karakterleri için
  return "﻿" + [headers.join(","), ...rows].join("\n");
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, message: "Yetkisiz." }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const format = (sp.get("format") ?? "csv").toLowerCase();

  let leads: LeadRow[];
  try {
    leads = await listLeads({
      status: sp.get("status") ?? undefined,
      temperature: sp.get("temperature") ?? undefined,
      since: sp.get("since") ?? undefined,
    });
  } catch (err) {
    console.error("[/api/leads/export] list failed", err);
    return NextResponse.json(
      { ok: false, message: "Export basarisiz." },
      { status: 500 },
    );
  }

  const ts = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new NextResponse(JSON.stringify({ ok: true, leads }, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="nextreach-leads-${ts}.json"`,
      },
    });
  }

  // CSV default
  const csv = leadsToCsv(leads);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nextreach-leads-${ts}.csv"`,
    },
  });
}
