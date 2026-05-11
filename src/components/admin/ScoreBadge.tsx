/**
 * Renkli skor rozeti — admin tablosunda ve detay panelinde kullanilir.
 * Renkler docs/01-design-system.md'ye uyumlu.
 */
import { cn } from "@/lib/utils";

type Temperature = "hot" | "warm" | "cold";

const STYLE: Record<Temperature, string> = {
  hot: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  warm: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  cold: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

const LABEL: Record<Temperature, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

export function ScoreBadge({
  score,
  temperature,
  size = "sm",
}: {
  score: number;
  temperature: Temperature;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        STYLE[temperature],
      )}
      aria-label={`${LABEL[temperature]} lead, skor ${score}`}
    >
      {temperature === "hot" && <span aria-hidden>🔥</span>}
      {LABEL[temperature]} {score}
    </span>
  );
}
