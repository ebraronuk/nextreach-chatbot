/**
 * Lead scoring — 0-100 arasi puan.
 *
 * Kurallar (README'deki "Lead Scoring" bolumune referans):
 *   + Kurumsal email      +25
 *   + Hacim 5k+           +30
 *   + Hacim 500-5k        +15
 *   + Zaman: bu hafta/ay  +25
 *   + Rakip kullaniyor    +20
 *   - Cok kisa konusma   -15 (<30 sn)
 *   - Bos cevap orani    -10
 */
import type { LeadInput } from "@/types/lead";

const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "yandex.com",
  "mail.com",
  "protonmail.com",
]);

export function isCorporateEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return !PERSONAL_DOMAINS.has(domain);
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

  if (lead.currentTool && lead.currentTool.length > 2) {
    breakdown.push({ reason: "Rakip arac kullaniyor", delta: 20 });
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
