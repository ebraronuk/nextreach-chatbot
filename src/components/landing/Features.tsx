/**
 * Features — bento grid stilinde 3 ozellik karti.
 * Asimetri: solda buyuk kart (col-span-2 md), sagda iki kucuk.
 */
import { Activity, Boxes, Plug } from "lucide-react";

export function Features() {
  return (
    <section
      id="features"
      aria-label="NextReach ozellikleri"
      className="max-w-6xl mx-auto px-6 py-20 md:py-28"
    >
      <div className="max-w-2xl mb-10 md:mb-14">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
          Operasyonunuzu görmek için
          <br />
          başka ekrana geçmeyin.
        </h2>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Sipariş, stok ve müşteri verisi tek bir panoda. Anlık güncellenen
          metrikler, akıllı uyarılar ve dışa aktarılabilir raporlar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Buyuk kart — gercek zamanli gelir */}
        <article className="md:col-span-2 rounded-2xl ring-1 ring-slate-200 bg-white p-6 md:p-8 hover:-translate-y-0.5 transition group">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-xl bg-gradient-to-br from-brand-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20 shrink-0">
              <Activity className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Gerçek zamanlı gelir akışı
              </h3>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Web sitesi, mağaza ve pazaryeri kanallarınız tek bir panoda.
                Her saniye güncellenen gelir, en çok satan ürün ve dönüşüm
                metrikleriyle günü pasif izlemek yerine yönetin.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { k: "Web", v: "₺92.140" },
              { k: "Mağaza", v: "₺48.620" },
              { k: "Pazaryeri", v: "₺43.490" },
            ].map((row) => (
              <div
                key={row.k}
                className="rounded-lg bg-slate-50 ring-1 ring-slate-200 px-3 py-2"
              >
                <p className="text-[11px] text-slate-500">{row.k}</p>
                <p className="text-sm font-semibold tabular-nums text-slate-900">
                  {row.v}
                </p>
              </div>
            ))}
          </div>
        </article>

        {/* Kucuk kart — stok uyarisi */}
        <article className="rounded-2xl ring-1 ring-slate-200 bg-white p-6 hover:-translate-y-0.5 transition">
          <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Boxes className="size-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            Akıllı stok uyarıları
          </h3>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            Tükenmeden önce haber alın. Geçmiş satış hızına göre tahmin
            edilen yeniden sipariş tarihleri.
          </p>
        </article>

        {/* Kucuk kart — entegrasyon */}
        <article className="rounded-2xl ring-1 ring-slate-200 bg-white p-6 hover:-translate-y-0.5 transition">
          <div className="size-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
            <Plug className="size-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            Hazır entegrasyonlar
          </h3>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            Shopify, Ticimax, Trendyol, Hepsiburada, n11. Aynı gün
            bağlanır, ilk veri akışı 10 dakikada başlar.
          </p>
        </article>

        {/* Genis ikinci satir — entegrasyon kanallari */}
        <article className="md:col-span-3 rounded-2xl ring-1 ring-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Sales ekibinizin kullandığı araçlarla konuşur
              </h3>
              <p className="mt-1 text-sm text-slate-600 max-w-xl leading-relaxed">
                CSV, Excel ve Slack üzerinden günlük rapor; HubSpot ve Pipedrive
                için lead push; webhook ile özel sistemlerinize entegrasyon.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                "Slack",
                "HubSpot",
                "Pipedrive",
                "Shopify",
                "Trendyol",
                "Hepsiburada",
                "n11",
              ].map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-white ring-1 ring-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
