/**
 * MockDashboard — hero icin sahte analitik dashboard gorseli.
 * Saf SVG + Tailwind ile cizilmis, dis gorsel yok (perf + saf depo).
 */
import { ArrowUpRight, TrendingUp, AlertTriangle, Package } from "lucide-react";

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  trend,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down";
}) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="size-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
          <Icon className="size-4" />
        </div>
        <span
          className={
            "text-xs font-medium tabular-nums " +
            (trend === "up" ? "text-green-600" : "text-amber-600")
          }
        >
          {delta}
        </span>
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
        {value}
      </p>
    </div>
  );
}

export function MockDashboard() {
  return (
    <div
      className="relative rounded-2xl ring-1 ring-slate-200 bg-white shadow-2xl shadow-brand-500/10 overflow-hidden"
      role="img"
      aria-label="NextReach panel önizlemesi"
    >
      {/* Window top bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <span className="size-2 rounded-full bg-red-300" />
        <span className="size-2 rounded-full bg-amber-300" />
        <span className="size-2 rounded-full bg-green-300" />
        <span className="ml-3 text-xs text-slate-400 font-mono">
          app.nextreach.io
        </span>
      </div>

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500">Pano · Bugün</p>
            <p className="text-sm font-semibold text-slate-900">Operasyon Özeti</p>
          </div>
          <button
            type="button"
            disabled
            className="text-xs text-brand-600 inline-flex items-center gap-1 cursor-default"
            aria-hidden
            tabIndex={-1}
          >
            Detay <ArrowUpRight className="size-3" />
          </button>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Kpi
            icon={TrendingUp}
            label="Bugünkü gelir"
            value="₺184.250"
            delta="+12%"
            trend="up"
          />
          <Kpi
            icon={Package}
            label="Aktif sipariş"
            value="2.847"
            delta="+5%"
            trend="up"
          />
          <Kpi
            icon={AlertTriangle}
            label="Stok uyarısı"
            value="14"
            delta="-3"
            trend="down"
          />
        </div>

        {/* Fake chart */}
        <div className="rounded-xl ring-1 ring-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-600">7 günlük gelir</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-brand-500" /> Gelir
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-cyan-400" /> Hedef
              </span>
            </div>
          </div>

          <svg viewBox="0 0 320 100" className="w-full h-24" aria-hidden>
            <defs>
              <linearGradient id="ndArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ndLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>

            {/* grid */}
            {[20, 50, 80].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="320"
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="3 4"
                strokeWidth="0.5"
              />
            ))}

            {/* target dashed line */}
            <path
              d="M0 55 L320 35"
              stroke="#22d3ee"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              fill="none"
            />

            {/* revenue area */}
            <path
              d="M0 70 L45 55 L90 60 L135 40 L180 48 L225 28 L270 32 L320 18 L320 100 L0 100 Z"
              fill="url(#ndArea)"
            />
            {/* revenue line */}
            <path
              d="M0 70 L45 55 L90 60 L135 40 L180 48 L225 28 L270 32 L320 18"
              stroke="url(#ndLine)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* end dot */}
            <circle cx="320" cy="18" r="3.5" fill="#22d3ee" />
            <circle cx="320" cy="18" r="6" fill="#22d3ee" fillOpacity="0.2" />
          </svg>
        </div>
      </div>

      {/* Subtle glow accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-cyan-300/30 blur-3xl"
      />
    </div>
  );
}
