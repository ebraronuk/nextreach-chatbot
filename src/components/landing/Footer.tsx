/**
 * Footer — 4 sutun, profesyonel B2B SaaS standardi.
 * Linkler placeholder (#) ama yapısı dogru — production'da gercek
 * hedeflere baglanir.
 */
import { Mail, MapPin } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="size-7 rounded-md bg-gradient-to-br from-brand-600 via-blue-500 to-cyan-400" />
              <span className="font-semibold tracking-tight text-slate-900">
                NextReach
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              E-ticaret operasyonunuzun komuta merkezi. Veriniz, kararınız,
              büyümeniz — tek panoda.
            </p>
          </div>

          {/* Urun */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">
              Ürün
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#features" className="text-slate-500 hover:text-slate-900 transition">
                  Özellikler
                </a>
              </li>
              <li>
                <a href="#stats" className="text-slate-500 hover:text-slate-900 transition">
                  Müşteriler
                </a>
              </li>
              <li>
                <a href="#faq" className="text-slate-500 hover:text-slate-900 transition">
                  Sık sorulan sorular
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-slate-900 transition">
                  Entegrasyonlar
                </a>
              </li>
            </ul>
          </div>

          {/* Sirket */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">
              Şirket
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-slate-500 hover:text-slate-900 transition">
                  Hakkımızda
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-slate-900 transition">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-slate-900 transition">
                  Kariyer
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-slate-900 transition">
                  Basın kiti
                </a>
              </li>
            </ul>
          </div>

          {/* Iletisim + Yasal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">
              İletişim & Yasal
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-slate-500">
                <Mail className="size-3.5" />
                <a
                  href="mailto:hello@nextreach.io"
                  className="hover:text-slate-900 transition"
                >
                  hello@nextreach.io
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-500">
                <MapPin className="size-3.5" />
                <span>İstanbul, Türkiye</span>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-slate-900 transition">
                  Gizlilik Politikası
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-slate-900 transition">
                  Kullanım Koşulları
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-500 hover:text-slate-900 transition">
                  KVKK Aydınlatma
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-xs text-slate-400">
            © {year} NextReach Teknoloji A.Ş. · Tüm hakları saklıdır
          </p>
          <p className="text-xs text-slate-400">
            ISO 27001 sertifikalı · KVKK ve GDPR uyumlu
          </p>
        </div>
      </div>
    </footer>
  );
}
