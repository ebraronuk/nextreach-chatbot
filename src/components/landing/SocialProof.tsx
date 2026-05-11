/**
 * SocialProof — gercek logolarimiz olmadigi icin sayilarla guven insa ediyoruz.
 * Stilistik karar: numara + alt etiket, ferah, monospace rakamlar.
 */
export function SocialProof() {
  const stats: Array<{ value: string; label: string }> = [
    { value: "300+", label: "aktif marka" },
    { value: "₺1.2M+", label: "günlük işlem hacmi" },
    { value: "%99,9", label: "uptime (son 90 gün)" },
    { value: "24 sa", label: "ortalama yanıt süresi" },
  ];

  return (
    <section
      id="stats"
      aria-label="NextReach kullanim sayilari"
      className="border-y border-slate-200 bg-slate-50/40"
    >
      <div className="max-w-6xl mx-auto px-6 py-12">
        <p className="text-center text-xs font-medium uppercase tracking-wider text-slate-500 mb-8">
          Türkiye&apos;nin önde gelen e-ticaret markalarının tercihi
        </p>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <dt className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {s.value}
              </dt>
              <dd className="mt-1 text-sm text-slate-500">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
