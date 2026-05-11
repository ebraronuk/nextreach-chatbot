/**
 * Aylin'in scripted mesajlari ve quick reply secenekleri.
 *
 * Burada mesajlari sabit tutmamizin sebebi: 6 saatlik limitte konusma akisinin
 * ongorulebilir olmasi. Gemini'yi kullanici "off-script" gittiginde devreye
 * sokuyoruz (fiyat sorma, teknik soru vs.) — docs/02-conversation-flow.md.
 */
import type { Intent, Timeline, Volume } from "@/types/lead";
import type { LeadData, QuickReply, Step } from "./types";

const INTENT_LABEL: Record<Intent, string> = {
  demo: "Demo gormek",
  pricing: "Fiyatlandirma",
  integration: "Entegrasyon",
  support: "Destek",
  other: "Genel bilgi",
};

const VOLUME_LABEL: Record<Volume, string> = {
  "<500": "Aylik 500'den az",
  "500-5k": "Aylik 500-5.000",
  "5k-50k": "Aylik 5.000-50.000",
  "50k+": "Aylik 50.000+",
};

const TIMELINE_LABEL: Record<Timeline, string> = {
  "this-week": "Bu hafta",
  "this-month": "Bu ay icinde",
  "this-quarter": "Bu ceyrek",
  researching: "Henuz arastiriyorum",
};

export function intentLabel(intent?: Intent): string {
  return intent ? INTENT_LABEL[intent] : "Genel";
}

export function volumeLabel(volume?: Volume): string {
  return volume ? VOLUME_LABEL[volume] : "Belirtilmedi";
}

export function timelineLabel(timeline?: Timeline | null): string {
  if (!timeline) return "Belirtilmedi";
  return TIMELINE_LABEL[timeline];
}

export interface BotMessage {
  content: string;
  quickReplies?: QuickReply[];
}

const GREETING_QUICK_REPLIES: QuickReply[] = [
  { label: "Demo gormek istiyorum", echo: "Demo gormek istiyorum", payload: "demo" },
  { label: "Fiyatlandirma", echo: "Fiyatlandirma hakkinda bilgi almak istiyorum", payload: "pricing" },
  { label: "Entegrasyon sormak", echo: "Entegrasyonlari sormak istiyorum", payload: "integration" },
  { label: "Genel bilgi", echo: "Genel bilgi almak istiyorum", payload: "other" },
];

const VOLUME_QUICK_REPLIES: QuickReply[] = [
  { label: "500'den az", echo: "Aylik 500'den az siparis", payload: "<500" },
  { label: "500 - 5.000", echo: "Aylik 500-5.000 siparis", payload: "500-5k" },
  { label: "5.000 - 50.000", echo: "Aylik 5.000-50.000 siparis", payload: "5k-50k" },
  { label: "50.000+", echo: "Aylik 50.000'den fazla siparis", payload: "50k+" },
];

const TOOL_QUICK_REPLIES: QuickReply[] = [
  { label: "Hicbir sey kullanmiyoruz", echo: "Su an bir arac kullanmiyoruz", payload: "__none__" },
];

const TIMELINE_QUICK_REPLIES: QuickReply[] = [
  { label: "Bu hafta", echo: "Bu hafta baslamak istiyoruz", payload: "this-week" },
  { label: "Bu ay icinde", echo: "Bu ay icinde", payload: "this-month" },
  { label: "Bu ceyrek", echo: "Bu ceyrek icinde", payload: "this-quarter" },
  { label: "Henuz arastiriyorum", echo: "Henuz arastirma asamasindayim", payload: "researching" },
  { label: "Atla", echo: "Bu soruyu atlamak istiyorum", payload: "__skip__" },
];

const SUMMARY_QUICK_REPLIES: QuickReply[] = [
  { label: "Evet, gonder", echo: "Evet, gonderelim", payload: "__confirm__" },
  { label: "Bir seyi degistirmek istiyorum", echo: "Bir bilgiyi guncellemek istiyorum", payload: "__edit__" },
];

const PERSONAL_EMAIL_CONFIRM_REPLIES: QuickReply[] = [
  { label: "Evet, bu adresle devam", echo: "Bu e-posta ile devam edelim", payload: "__keep__" },
  { label: "Sirket e-postasi gireyim", echo: "Sirket e-postami yazayim", payload: "__retry__" },
];

export function botMessageForStep(step: Step, lead: LeadData): BotMessage {
  switch (step) {
    case "greeting":
      return {
        content:
          "Merhaba! 👋 Ben Aylin, NextReach satis danismaniyim. Bugun size nasil yardimci olabilirim?",
        quickReplies: GREETING_QUICK_REPLIES,
      };
    case "identity_name":
      return {
        content: "Cok iyi! Once kisaca tanisalim. Adiniz nedir?",
      };
    case "identity_company":
      return {
        content: `Tanistigimiza sevindim, ${lead.name ?? ""}. Hangi sirketten yaziyorsunuz?`.trim(),
      };
    case "identity_email":
      return {
        content:
          "Ekibimizin size dogrudan donus yapabilmesi icin is e-postanizi alabilir miyim?",
      };
    case "identity_email_confirm_personal":
      return {
        content:
          "Kisisel adresinizi gormus oldum. Mumkun ise sirket e-postaniz, takip kalitemiz icin daha iyi olur. Yine de bu adresle devam etmek ister misiniz?",
        quickReplies: PERSONAL_EMAIL_CONFIRM_REPLIES,
      };
    case "qualification_volume":
      return {
        content:
          "NextReach'i sizin icin daha iyi konumlandirabilmem icin: aylik yaklasik kac siparis isliyorsunuz?",
        quickReplies: VOLUME_QUICK_REPLIES,
      };
    case "qualification_tool":
      return {
        content:
          "Su an siparis ve analitik tarafinda hangi araclari kullaniyorsunuz?",
        quickReplies: TOOL_QUICK_REPLIES,
      };
    case "timeline":
      return {
        content:
          "Son bir sorum: NextReach'i kullanmaya ne zaman baslamayi dusunuyorsunuz?",
        quickReplies: TIMELINE_QUICK_REPLIES,
      };
    case "summary":
      return {
        content: buildSummaryContent(lead),
        quickReplies: SUMMARY_QUICK_REPLIES,
      };
    case "submitted":
      return {
        content:
          "Mukemmel! 🎉 Talebinizi olusturuyorum. Ekibimizden bir uzman 24 saat icinde size donus yapacak.",
      };
  }
}

function buildSummaryContent(lead: LeadData): string {
  const lines = [
    "Sizi anladim ✓",
    "",
    "📋 Talebinizin ozeti:",
    `  • ${lead.name ?? "—"} / ${lead.company ?? "—"}`,
    `  • ${lead.email ?? "—"}`,
    `  • Niyetiniz: ${intentLabel(lead.intent)}`,
    `  • ${volumeLabel(lead.volume)}`,
    `  • Su anki cozum: ${lead.currentTool ?? "Belirtilmedi"}`,
    `  • Baslangic: ${timelineLabel(lead.timeline)}`,
    "",
    "Bu bilgilerle ekibimize ileteyim mi?",
  ];
  return lines.join("\n");
}
