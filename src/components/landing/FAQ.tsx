"use client";

/**
 * FAQ — Sik sorulan sorular accordion.
 *
 * Brief'te yok ama B2B SaaS landing'lerinde conversion'i artiran standard
 * bir bolum. Ziyaretci en yaygin endiselerine cevap alir, chatbot'a yuksek
 * niyetle gelir.
 *
 * - Native <details>/<summary> kullaniyoruz: keyboard-friendly, JS olmadan
 *   da calisir, screen-reader uyumlu, browser tarafindan optimize edilmis.
 * - Acilma animasyonu: ufak fade (subtle, agresif degil).
 */
import { ChevronDown } from "lucide-react";

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "Hangi e-ticaret platformları ile entegre olur?",
    a: "Shopify, Ticimax, IdeaSoft, WooCommerce, Trendyol, Hepsiburada ve n11 için hazır entegrasyonlarımız var. Özel sistem kullanıyorsanız webhook veya CSV import ile bir günden kısa sürede bağlıyoruz.",
  },
  {
    q: "Verim güvende mi?",
    a: "Verileriniz Türkiye'de barındırılan, ISO 27001 sertifikalı sunucularda şifrelenmiş olarak saklanır. KVKK ve GDPR uyumluyuz; istediğiniz an verinizi indirebilir veya silebilirsiniz. Üçüncü taraflarla paylaşmayız.",
  },
  {
    q: "Demo süreci nasıl işliyor?",
    a: "Bu sohbette aldığımız bilgilerle satış ekibimiz 24 saat içinde size dönüyor. 30 dakikalık bir online demoda hem ürünü kendi verinizle gösteriyoruz hem de sizin için doğru pakete birlikte karar veriyoruz. Demo sonrası 14 gün ücretsiz deneme.",
  },
  {
    q: "Fiyatlandırma modeliniz nasıl?",
    a: "Aylık sipariş hacminize ve aktif kullanıcı sayınıza göre değişen 3 plan sunuyoruz: Başlangıç, Pro ve Enterprise. Kart bilgisi istemiyoruz, demonun ardından ihtiyacınıza özel teklif iletiyoruz.",
  },
  {
    q: "Mevcut araçlarımızı bırakmamız gerekir mi?",
    a: "Hayır. NextReach bir veri ambarı gibi çalışıyor — Shopify, Excel, Google Analytics gibi araçlarınız çalışmaya devam eder. Biz bu kaynaklardan veriyi topluyor, anlamlı bir panoda gösteriyoruz.",
  },
  {
    q: "Kurulum ne kadar sürer?",
    a: "Ortalama 15 dakika. Shopify/Trendyol gibi platformlarda tek tıkla; özel sistemde teknik ekibimiz size eşlik ediyor. İlk veri akışı kurulumun ardından 10 dakikada başlıyor.",
  },
];

export function FAQ() {
  return (
    <section
      id="faq"
      aria-label="Sık sorulan sorular"
      className="border-t border-slate-200 bg-slate-50/30"
    >
      <div className="max-w-3xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center mb-10 md:mb-14">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100">
            SSS
          </p>
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
            Aklınızdaki sorular
          </h2>
          <p className="mt-3 text-slate-600 leading-relaxed">
            Aşağıdakileri cevaplamak için zaman ayırın; gerisini Aylin ile
            sohbette konuşalım.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl ring-1 ring-slate-200 bg-white open:ring-brand-200 open:shadow-md transition"
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 rounded-2xl">
                <span className="text-sm md:text-base font-medium text-slate-900">
                  {item.q}
                </span>
                <ChevronDown className="size-4 text-slate-400 shrink-0 transition group-open:rotate-180 group-open:text-brand-600" />
              </summary>
              <div className="px-6 pb-6 pt-1">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {item.a}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
