"use client";

/**
 * AdminDashboard — admin sayfasinin client orchestrator'u.
 * - Server'dan gelen initialLeads'i state'e alir
 * - Filtre + secili lead state'i tutar
 * - KPI'lari hesaplar
 * - FiltersBar, LeadsTable, LeadDetailPanel'i komponoze eder
 *
 * Realtime gelistirme: page yenilenmeden listeyi guncellemek icin
 * supabase browser client ile subscribe edilebilir; bu MVP'de manuel
 * "yenile" yeterli kabul edildi (link adresi tek tikla yenilenebilir).
 */
import { useMemo, useState } from "react";
import type { LeadRow } from "@/lib/db/supabase";
import { FiltersBar, type TemperatureFilter, type StatusFilter, type DateFilter } from "./FiltersBar";
import { LeadsTable } from "./LeadsTable";
import { LeadDetailPanel } from "./LeadDetailPanel";

function isAfter(iso: string, since: Date): boolean {
  return new Date(iso).getTime() >= since.getTime();
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - 7);
  return d;
}

export function AdminDashboard({
  initialLeads,
  adminKey,
}: {
  initialLeads: LeadRow[];
  adminKey: string;
}) {
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [tempFilter, setTempFilter] = useState<TemperatureFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let arr = leads;
    if (tempFilter !== "all") arr = arr.filter((l) => l.temperature === tempFilter);
    if (statusFilter !== "all") arr = arr.filter((l) => l.status === statusFilter);
    if (dateFilter === "today") {
      const today = startOfToday();
      arr = arr.filter((l) => isAfter(l.created_at, today));
    } else if (dateFilter === "week") {
      const week = startOfWeek();
      arr = arr.filter((l) => isAfter(l.created_at, week));
    }
    return arr;
  }, [leads, tempFilter, statusFilter, dateFilter]);

  // KPI'lar tum lead'lerden hesaplanir (filtreden bagimsiz)
  const counts = useMemo(() => {
    let hot = 0;
    let warm = 0;
    let cold = 0;
    for (const l of leads) {
      if (l.temperature === "hot") hot++;
      else if (l.temperature === "warm") warm++;
      else cold++;
    }
    return { hot, warm, cold, total: leads.length };
  }, [leads]);

  const selectedLead = selectedId ? leads.find((l) => l.id === selectedId) ?? null : null;

  function handleUpdated(updated: LeadRow) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  return (
    <div className="space-y-5">
      {/* KPI'lar */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="🔥 Hot"
          value={counts.hot}
          accent="text-red-600"
          bg="bg-red-50"
          ring="ring-red-100"
        />
        <KpiCard
          label="Warm"
          value={counts.warm}
          accent="text-amber-600"
          bg="bg-amber-50"
          ring="ring-amber-100"
        />
        <KpiCard
          label="Cold"
          value={counts.cold}
          accent="text-slate-700"
          bg="bg-slate-100"
          ring="ring-slate-200"
        />
      </div>

      <FiltersBar
        temperature={tempFilter}
        status={statusFilter}
        date={dateFilter}
        onTemperatureChange={setTempFilter}
        onStatusChange={setStatusFilter}
        onDateChange={setDateFilter}
      />

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {filtered.length} lead gösteriliyor
          {filtered.length !== leads.length && ` (toplam ${leads.length})`}
        </span>
      </div>

      <LeadsTable
        leads={filtered}
        selectedId={selectedId}
        onSelect={(l) => setSelectedId(l.id)}
      />

      <LeadDetailPanel
        lead={selectedLead}
        adminKey={adminKey}
        onClose={() => setSelectedId(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
  bg,
  ring,
}: {
  label: string;
  value: number;
  accent: string;
  bg: string;
  ring: string;
}) {
  return (
    <div className={`rounded-2xl ${bg} ring-1 ${ring} p-4`}>
      <p className="text-xs font-medium text-slate-600 mb-1">{label}</p>
      <p className={`text-3xl font-semibold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
