"use client";

/**
 * LeadsTable — lead listesi.
 * Satira tiklandiginda parent'a `onSelect` ile bildirir; secili satir highlight olur.
 */
import { ScoreBadge } from "./ScoreBadge";
import type { LeadRow } from "@/lib/db/supabase";
import { cn } from "@/lib/utils";

const INTENT_LABEL: Record<string, string> = {
  demo: "Demo",
  pricing: "Fiyat",
  integration: "Entegrasyon",
  support: "Destek",
  other: "Diğer",
};

const TIMELINE_LABEL: Record<string, string> = {
  "this-week": "Bu hafta",
  "this-month": "Bu ay",
  "this-quarter": "Bu çeyrek",
  researching: "Araştırıyor",
};

const STATUS_LABEL: Record<LeadRow["status"], string> = {
  new: "Yeni",
  contacted: "İletişimde",
  qualified: "Kalifiye",
  rejected: "Reddedildi",
};

const STATUS_STYLE: Record<LeadRow["status"], string> = {
  new: "bg-brand-50 text-brand-700",
  contacted: "bg-slate-100 text-slate-700",
  qualified: "bg-green-50 text-green-700",
  rejected: "bg-slate-100 text-slate-500",
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffSec = Math.round((now - d.getTime()) / 1000);
  if (diffSec < 60) return "az önce";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} dk önce`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} sa önce`;
  if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)} gün önce`;
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export function LeadsTable({
  leads,
  selectedId,
  onSelect,
}: {
  leads: LeadRow[];
  selectedId: string | null;
  onSelect: (lead: LeadRow) => void;
}) {
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-slate-500 text-sm">
          Filtreye uygun lead bulunamadı. Filtreleri sıfırlayın veya yeni bir konuşma bekleyin.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Desktop tablo */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Skor</th>
              <th className="px-4 py-3 text-left">İsim / Şirket</th>
              <th className="px-4 py-3 text-left">E-posta</th>
              <th className="px-4 py-3 text-left">Niyet</th>
              <th className="px-4 py-3 text-left">Zaman</th>
              <th className="px-4 py-3 text-left">Durum</th>
              <th className="px-4 py-3 text-left">Oluşturulma</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => {
              const isSelected = lead.id === selectedId;
              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelect(lead)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(lead);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${lead.name} detayını aç`}
                  className={cn(
                    "cursor-pointer transition outline-none",
                    isSelected ? "bg-brand-50" : "hover:bg-slate-50",
                    "focus-visible:bg-brand-50",
                  )}
                >
                  <td className="px-4 py-3">
                    <ScoreBadge score={lead.score} temperature={lead.temperature} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{lead.name}</div>
                    <div className="text-xs text-slate-500">{lead.company}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{lead.email}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.intent ? INTENT_LABEL[lead.intent] ?? lead.intent : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.timeline ? TIMELINE_LABEL[lead.timeline] ?? lead.timeline : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        STATUS_STYLE[lead.status],
                      )}
                    >
                      {STATUS_LABEL[lead.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatRelative(lead.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile kart gorunumu */}
      <ul className="md:hidden divide-y divide-slate-100">
        {leads.map((lead) => {
          const isSelected = lead.id === selectedId;
          return (
            <li
              key={lead.id}
              onClick={() => onSelect(lead)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(lead);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`${lead.name} detayını aç`}
              className={cn(
                "px-4 py-3 cursor-pointer transition outline-none",
                isSelected ? "bg-brand-50" : "hover:bg-slate-50",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <ScoreBadge score={lead.score} temperature={lead.temperature} />
                <span className="text-xs text-slate-500">
                  {formatRelative(lead.created_at)}
                </span>
              </div>
              <div className="font-medium text-slate-900">{lead.name}</div>
              <div className="text-xs text-slate-500">{lead.company}</div>
              <div className="text-xs text-slate-600 mt-1 truncate">{lead.email}</div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_STYLE[lead.status],
                  )}
                >
                  {STATUS_LABEL[lead.status]}
                </span>
                {lead.intent && (
                  <span className="text-xs text-slate-500">
                    · {INTENT_LABEL[lead.intent] ?? lead.intent}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
