/**
 * Admin sayfasi yuklenirken gosterilen skeleton.
 * Server'dan lead'ler cekilirken kullanici bos beyaz gormesin.
 */
export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="h-5 w-40 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-56 bg-slate-100 rounded animate-pulse" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* KPI'lar */}
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white ring-1 ring-slate-200 p-4"
            >
              <div className="h-3 w-12 bg-slate-200 rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Filtreler */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="h-3 w-20 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="flex gap-2">
                <div className="h-6 w-14 bg-slate-100 rounded-full animate-pulse" />
                <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" />
                <div className="h-6 w-14 bg-slate-100 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Tablo */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="px-4 py-3 border-b border-slate-100 last:border-0 flex items-center gap-4"
            >
              <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
              <div className="flex-1">
                <div className="h-3 w-32 bg-slate-200 rounded animate-pulse mb-1.5" />
                <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-3 w-32 bg-slate-100 rounded animate-pulse hidden md:block" />
              <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
