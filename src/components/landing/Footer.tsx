/**
 * Footer — sade, copyright + kurum bilgisi.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-6 rounded-md bg-gradient-to-br from-brand-600 via-blue-500 to-cyan-400" />
          <span className="font-semibold tracking-tight text-slate-900">
            NextReach
          </span>
          <span className="text-xs text-slate-400 ml-1">
            · E-ticaret analitik platformu
          </span>
        </div>

        <div className="flex items-center gap-5 text-sm text-slate-500">
          <a href="#features" className="hover:text-slate-900 transition">
            Özellikler
          </a>
          <a href="#stats" className="hover:text-slate-900 transition">
            Müşteriler
          </a>
          <a href="#top" className="hover:text-slate-900 transition">
            Yukarı
          </a>
        </div>

        <p className="text-xs text-slate-400">
          © {year} NextReach · Tüm hakları saklıdır
        </p>
      </div>
    </footer>
  );
}
