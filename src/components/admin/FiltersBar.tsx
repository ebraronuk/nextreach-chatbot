"use client";

/**
 * FiltersBar — admin tablonun ustundeki chip filtreleri.
 * Tum filtreleme client-side (yuklenen tum lead'ler uzerinde).
 */
import { cn } from "@/lib/utils";

export type TemperatureFilter = "all" | "hot" | "warm" | "cold";
export type StatusFilter = "all" | "new" | "contacted" | "qualified" | "rejected";
export type DateFilter = "all" | "today" | "week";

interface Props {
  temperature: TemperatureFilter;
  status: StatusFilter;
  date: DateFilter;
  onTemperatureChange: (v: TemperatureFilter) => void;
  onStatusChange: (v: StatusFilter) => void;
  onDateChange: (v: DateFilter) => void;
}

interface Chip<T extends string> {
  value: T;
  label: string;
}

const TEMP_CHIPS: Chip<TemperatureFilter>[] = [
  { value: "all", label: "Tümü" },
  { value: "hot", label: "🔥 Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
];

const STATUS_CHIPS: Chip<StatusFilter>[] = [
  { value: "all", label: "Tümü" },
  { value: "new", label: "Yeni" },
  { value: "contacted", label: "İletişime geçildi" },
  { value: "qualified", label: "Kalifiye" },
  { value: "rejected", label: "Reddedildi" },
];

const DATE_CHIPS: Chip<DateFilter>[] = [
  { value: "all", label: "Tümü" },
  { value: "today", label: "Bugün" },
  { value: "week", label: "Bu hafta" },
];

function ChipGroup<T extends string>({
  title,
  chips,
  value,
  onChange,
}: {
  title: string;
  chips: Chip<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => {
          const active = c.value === value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange(c.value)}
              aria-pressed={active}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition border",
                active
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FiltersBar(props: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChipGroup
          title="Sıcaklık"
          chips={TEMP_CHIPS}
          value={props.temperature}
          onChange={props.onTemperatureChange}
        />
        <ChipGroup
          title="Durum"
          chips={STATUS_CHIPS}
          value={props.status}
          onChange={props.onStatusChange}
        />
        <ChipGroup
          title="Tarih"
          chips={DATE_CHIPS}
          value={props.date}
          onChange={props.onDateChange}
        />
      </div>
    </div>
  );
}
