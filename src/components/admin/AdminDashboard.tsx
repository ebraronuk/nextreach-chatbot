"use client";

/**
 * AdminDashboard — admin sayfasinin client orchestrator'u.
 *
 * Realtime stratejisi:
 *   Migration 001 ile RLS sikilastirildi (anon SELECT yok). Bu yuzden
 *   browser-side Supabase Realtime subscribe edilemez. Bunun yerine:
 *
 *   1. Manuel "Yenile" butonu (her zaman ulasilabilir)
 *   2. Pencere odaga gelince otomatik yenile (kullanici tab'a doner donmez taze veri)
 *   3. Polling devre disi (gurultu yapmamak icin opt-in; 60sn ile ileride aktif)
 *
 *   Server tarafindan GET /api/leads (admin key dogrulamali) cagriyor. 4xx/5xx
 *   ise "Yenile" butonu hata state'i gosteriyor.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, RefreshCcw } from "lucide-react";
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
  const [newRowIds, setNewRowIds] = useState<Set<string>>(() => new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number>(() => Date.now());

  // Unmount guard — setTimeout/fetch tamamlandiginda component yok olduysa
  // setState yapmamak icin.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Yenile — server'dan tum lead'leri yeniden cek
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch(
        `/api/leads?key=${encodeURIComponent(adminKey)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = (await res.json()) as { ok?: boolean; leads?: LeadRow[] };
      if (!mountedRef.current) return;
      if (!json.ok || !Array.isArray(json.leads)) {
        throw new Error("Beklenmedik sunucu cevabi");
      }

      // Onceki listede olmayan id'leri "yeni" olarak isaretle (highlight icin).
      setLeads((prev) => {
        const prevIds = new Set(prev.map((l) => l.id));
        const incoming = json.leads!;
        const freshIds = incoming
          .filter((l) => !prevIds.has(l.id))
          .map((l) => l.id);
        if (freshIds.length > 0 && mountedRef.current) {
          setNewRowIds((s) => {
            const next = new Set(s);
            for (const id of freshIds) next.add(id);
            return next;
          });
          // 3sn sonra highlight'i kaldir
          setTimeout(() => {
            if (!mountedRef.current) return;
            setNewRowIds((s) => {
              const next = new Set(s);
              for (const id of freshIds) next.delete(id);
              return next;
            });
          }, 3000);
        }
        return incoming;
      });
      setLastRefreshAt(Date.now());
    } catch (err) {
      if (!mountedRef.current) return;
      setRefreshError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [adminKey]);

  // Pencere fokuslandiginda yenile — kullanici tab'a doner donmez taze veri gorur.
  // Spam etmemek icin son yenilemeden 15sn'den fazla gectiyse tetikle.
  useEffect(() => {
    const FOCUS_REFRESH_THROTTLE_MS = 15_000;
    function onFocus() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefreshAt < FOCUS_REFRESH_THROTTLE_MS) return;
      void refresh();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh, lastRefreshAt]);

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

      <div className="flex items-center justify-between gap-3 text-sm text-slate-500 flex-wrap">
        <span>
          {filtered.length} lead gösteriliyor
          {filtered.length !== leads.length && ` (toplam ${leads.length})`}
        </span>
        <div className="flex items-center gap-3">
          {refreshError && (
            <span
              role="alert"
              className="text-xs text-red-600 bg-red-50 ring-1 ring-red-100 px-2 py-0.5 rounded-full"
            >
              Yenileme başarısız: {refreshError}
            </span>
          )}
          <a
            href={`/api/leads/export?key=${encodeURIComponent(adminKey)}&format=csv${
              tempFilter !== "all" ? `&temperature=${tempFilter}` : ""
            }${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            aria-label="Lead listesini CSV olarak indir"
            // CSV download — server attachment header doner, sayfa degismez
            download
          >
            <Download className="size-3.5" />
            CSV indir
          </a>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            aria-label="Lead listesini yenile"
          >
            <RefreshCcw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Yenileniyor..." : "Yenile"}
          </button>
        </div>
      </div>

      <LeadsTable
        leads={filtered}
        selectedId={selectedId}
        newRowIds={newRowIds}
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
