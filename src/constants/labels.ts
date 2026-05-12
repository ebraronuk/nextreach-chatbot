/**
 * Tum domain label'lari (intent / volume / timeline / status) tek dosyada.
 *
 * Onceden hem `lib/conversation/scripts.ts` hem `components/admin/LeadsTable.tsx`
 * (ve LeadDetailPanel) ayri ayri ayni sozlukleri tutuyordu. Tek source of truth.
 */
import type { Intent, Timeline, Volume } from "@/types/lead";

export const INTENT_LABEL: Record<Intent, string> = {
  demo: "Demo",
  pricing: "Fiyat",
  integration: "Entegrasyon",
  support: "Destek",
  other: "Diğer",
};

export const INTENT_LABEL_LONG: Record<Intent, string> = {
  demo: "Demo görmek",
  pricing: "Fiyatlandırma",
  integration: "Entegrasyon",
  support: "Destek",
  other: "Genel bilgi",
};

export const VOLUME_LABEL: Record<Volume, string> = {
  "<500": "Aylık 500'den az",
  "500-5k": "Aylık 500-5.000",
  "5k-50k": "Aylık 5.000-50.000",
  "50k+": "Aylık 50.000+",
};

export const TIMELINE_LABEL: Record<Timeline, string> = {
  "this-week": "Bu hafta",
  "this-month": "Bu ay",
  "this-quarter": "Bu çeyrek",
  researching: "Araştırıyor",
};

export type LeadStatus = "new" | "contacted" | "qualified" | "rejected";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Yeni",
  contacted: "İletişime geçildi",
  qualified: "Kalifiye",
  rejected: "Reddedildi",
};

export const STATUS_LABEL_SHORT: Record<LeadStatus, string> = {
  new: "Yeni",
  contacted: "İletişimde",
  qualified: "Kalifiye",
  rejected: "Reddedildi",
};
