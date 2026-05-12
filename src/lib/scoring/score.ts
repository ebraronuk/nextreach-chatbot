/**
 * Lead scoring — 0-100 arasi puan.
 *
 * Kurallar (README'deki "Lead Scoring" bolumune referans):
 *   + Kurumsal email                   +25
 *   + Hacim 5k+                        +30
 *   + Hacim 500-5k                     +15
 *   + Zaman: bu hafta/ay               +25
 *   + Bilinen rakip arac kullaniyor    +20
 *   + Adlandirilmis ozel cozum         +10
 *   - Cok kisa konusma (<30 sn)        -15
 */
import type { LeadInput } from "@/types/lead";
import { isCorporateEmail } from "@/constants/email";

export { isCorporateEmail };

/**
 * Bilinen rakip / analitik arac listesi. "Excel + Power BI" gibi serbest
 * metinler icinde substring matchledigimiz icin lower-case tutuyoruz.
 * Eslesirse skor +20 ("gecis adayi"); eslesmeyen ama anlamli (>=3 harfli
 * en az bir kelime) +10 ("kendi cozumu var, bilgi sahibi").
 */
const KNOWN_TOOLS = [
  "tableau",
  "power bi",
  "powerbi",
  "looker",
  "metabase",
  "google data studio",
  "looker studio",
  "redash",
  "qlik",
  "domo",
  "klaviyo",
  "mailchimp",
  "shopify",
  "hubspot",
  "salesforce",
  "pipedrive",
  "zoho",
  "excel",
  "google sheets",
  "google analytics",
  "ga4",
  "matomo",
  "mixpanel",
  "amplitude",
];

function classifyCurrentTool(value: string | undefined):
  | { kind: "known"; reason: string; delta: number }
  | { kind: "custom"; reason: string; delta: number }
  | null {
  if (!value) return null;
  const trimmed = value.trim();
  // En az 3 harfli en az bir kelime — "ben", "x", "—" gibi non-anlamli inputlari ele.
  const hasMeaningfulWord = /[a-zçğıöşüâîû]{3,}/i.test(trimmed);
  if (!hasMeaningfulWord) return null;

  const lower = trimmed.toLowerCase();
  if (KNOWN_TOOLS.some((tool) => lower.includes(tool))) {
    return { kind: "known", reason: "Bilinen rakip arac kullaniyor", delta: 20 };
  }
  // "Henuz bir arac kullanilmiyor" (chatbot quick reply) tedarik etmesin —
  // bu sinyal sadece somut bir cozumun olduguna isaret eder.
  if (/kullanmi|kullanmiyor|yok|none/i.test(lower)) return null;
  return { kind: "custom", reason: "Ozel cozum kullaniyor", delta: 10 };
}

export function scoreLead(lead: LeadInput): {
  score: number;
  breakdown: Array<{ reason: string; delta: number }>;
  temperature: "hot" | "warm" | "cold";
} {
  const breakdown: Array<{ reason: string; delta: number }> = [];

  if (lead.email && isCorporateEmail(lead.email)) {
    breakdown.push({ reason: "Kurumsal e-posta", delta: 25 });
  }

  switch (lead.volume) {
    case "50k+":
    case "5k-50k":
      breakdown.push({ reason: "Yuksek siparis hacmi (5k+)", delta: 30 });
      break;
    case "500-5k":
      breakdown.push({ reason: "Orta siparis hacmi", delta: 15 });
      break;
  }

  if (lead.timeline === "this-week" || lead.timeline === "this-month") {
    breakdown.push({ reason: "Yakin zamanli ilgi", delta: 25 });
  }

  const toolSignal = classifyCurrentTool(lead.currentTool);
  if (toolSignal) {
    breakdown.push({ reason: toolSignal.reason, delta: toolSignal.delta });
  }

  if (lead.conversationDurationSec && lead.conversationDurationSec < 30) {
    breakdown.push({ reason: "Cok kisa konusma", delta: -15 });
  }

  const score = Math.max(
    0,
    Math.min(100, breakdown.reduce((sum, b) => sum + b.delta, 0)),
  );

  const temperature: "hot" | "warm" | "cold" =
    score >= 80 ? "hot" : score >= 50 ? "warm" : "cold";

  return { score, breakdown, temperature };
}
