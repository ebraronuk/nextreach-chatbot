/**
 * Aylin'in scripted mesajlari ve quick reply secenekleri.
 *
 * Burada mesajlari sabit tutmamizin sebebi: 6 saatlik limitte konusma akisinin
 * ongorulebilir olmasi. Gemini'yi kullanici "off-script" gittiginde devreye
 * sokuyoruz (fiyat sorma, teknik soru vs.) — docs/02-conversation-flow.md.
 */
import type { Intent, Timeline, Volume } from "@/types/lead";
import type { LeadData, QuickReply, Step } from "./types";
import {
  INTENT_LABEL_LONG,
  VOLUME_LABEL,
  TIMELINE_LABEL,
} from "@/constants/labels";
import { PAYLOAD } from "./payloads";

// Sözlükler `constants/labels.ts`'e taşındı. Bu dosya sadece wrapper helper'lar
// sunuyor — null/undefined için fallback metinleri lokal kalıyor.
export function intentLabel(intent?: Intent): string {
  return intent ? INTENT_LABEL_LONG[intent] : "Genel";
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
  { label: "Hicbir sey kullanmiyoruz", echo: "Su an bir arac kullanmiyoruz", payload: PAYLOAD.NONE },
];

const TIMELINE_QUICK_REPLIES: QuickReply[] = [
  { label: "Bu hafta", echo: "Bu hafta baslamak istiyoruz", payload: "this-week" },
  { label: "Bu ay icinde", echo: "Bu ay icinde", payload: "this-month" },
  { label: "Bu ceyrek", echo: "Bu ceyrek icinde", payload: "this-quarter" },
  { label: "Henuz arastiriyorum", echo: "Henuz arastirma asamasindayim", payload: "researching" },
  { label: "Atla", echo: "Bu soruyu atlamak istiyorum", payload: PAYLOAD.SKIP },
];

const SUMMARY_QUICK_REPLIES: QuickReply[] = [
  { label: "Evet, gonder", echo: "Evet, gonderelim", payload: PAYLOAD.CONFIRM },
  { label: "Bir seyi degistirmek istiyorum", echo: "Bir bilgiyi guncellemek istiyorum", payload: PAYLOAD.EDIT },
];

const PERSONAL_EMAIL_CONFIRM_REPLIES: QuickReply[] = [
  { label: "Evet, bu adresle devam", echo: "Bu e-posta ile devam edelim", payload: PAYLOAD.KEEP },
  { label: "Sirket e-postasi gireyim", echo: "Sirket e-postami yazayim", payload: PAYLOAD.RETRY },
];

const SOFT_ABANDON_QUICK_REPLIES: QuickReply[] = [
  { label: "Yeni sohbet başlat", echo: "Yeniden başlayalım", payload: PAYLOAD.RESET },
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
        content: "Harika. Sizi tanıyabilir miyim — adınız?",
      };
    case "identity_company":
      return {
        content: `Memnun oldum, ${lead.name ?? ""}. Hangi şirketten yazıyorsunuz?`.trim(),
      };
    case "identity_email":
      return {
        content:
          "Ekibimizin doğrudan dönüş yapabilmesi için iş e-postanız?",
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
          "Size doğru paketi önerebilmem için: aylık yaklaşık kaç sipariş işliyorsunuz?",
        quickReplies: VOLUME_QUICK_REPLIES,
      };
    case "qualification_tool":
      return {
        content:
          "Şu an sipariş ve analitik tarafında hangi araçları kullanıyorsunuz?",
        quickReplies: TOOL_QUICK_REPLIES,
      };
    case "timeline":
      return {
        content:
          "Son sorum: NextReach'i kullanmaya ne zaman başlamayı düşünüyorsunuz?",
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
          "Aldım ✓ Talebinizi ekibimize ilettim — 24 saat içinde size dönüş yapacağız. Sizinle tanışmak güzeldi!",
      };
    case "soft_abandoned":
      return {
        content:
          "Anladım, şu an konuşmaya hazır olmayabilirsiniz 🙏\n\nİletişim talebinizi oluşturmak istediğinizde her zaman buradayız. Hazır olduğunuzda aşağıdaki butonla yeniden başlayabilirsiniz.",
        quickReplies: SOFT_ABANDON_QUICK_REPLIES,
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
