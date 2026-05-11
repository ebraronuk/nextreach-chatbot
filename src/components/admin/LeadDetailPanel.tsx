"use client";

/**
 * LeadDetailPanel — side drawer.
 * - AI ozeti
 * - Skor breakdown
 * - Tam transkript
 * - Status guncelleme select (PATCH /api/leads)
 * - Kopyala butonu
 */
import { useEffect, useState } from "react";
import { ScoreBadge } from "./ScoreBadge";
import type { LeadRow } from "@/lib/db/supabase";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: Array<{ value: LeadRow["status"]; label: string }> = [
  { value: "new", label: "Yeni" },
  { value: "contacted", label: "İletişime geçildi" },
  { value: "qualified", label: "Kalifiye" },
  { value: "rejected", label: "Reddedildi" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildCopyText(lead: LeadRow): string {
  const lines = [
    `İsim: ${lead.name}`,
    `Şirket: ${lead.company}`,
    `E-posta: ${lead.email}`,
    lead.phone ? `Telefon: ${lead.phone}` : null,
    `Skor: ${lead.score} (${lead.temperature})`,
    lead.intent ? `Niyet: ${lead.intent}` : null,
    lead.volume ? `Hacim: ${lead.volume}` : null,
    lead.current_tool ? `Şu anki çözüm: ${lead.current_tool}` : null,
    lead.timeline ? `Zaman: ${lead.timeline}` : null,
    lead.ai_summary ? `\nÖzet: ${lead.ai_summary}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

export function LeadDetailPanel({
  lead,
  adminKey,
  onClose,
  onUpdated,
}: {
  lead: LeadRow | null;
  adminKey: string;
  onClose: () => void;
  onUpdated: (updated: LeadRow) => void;
}) {
  const [status, setStatus] = useState<LeadRow["status"]>(lead?.status ?? "new");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (lead) setStatus(lead.status);
  }, [lead]);

  // Escape ile kapat
  useEffect(() => {
    if (!lead) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lead, onClose]);

  if (!lead) return null;

  async function handleStatusChange(next: LeadRow["status"]) {
    if (!lead) return;
    setStatus(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/leads?key=${encodeURIComponent(adminKey)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, status: next }),
      });
      if (res.ok) {
        onUpdated({ ...lead, status: next });
      } else {
        setStatus(lead.status); // revert
      }
    } catch {
      setStatus(lead.status);
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!lead) return;
    try {
      await navigator.clipboard.writeText(buildCopyText(lead));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // sessizce yok say
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Lead detayı"
        className="fixed top-0 right-0 z-50 h-full w-full sm:w-[480px] bg-white shadow-2xl flex flex-col animate-slide-up"
      >
        <header className="flex items-start justify-between gap-3 p-5 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ScoreBadge score={lead.score} temperature={lead.temperature} size="md" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 truncate">{lead.name}</h2>
            <p className="text-sm text-slate-500 truncate">{lead.company}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Paneli kapat"
            className="text-slate-400 hover:text-slate-700 transition p-1"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto chat-scroll p-5 space-y-6">
          {/* AI ozeti */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              AI Özeti
            </h3>
            {lead.ai_summary ? (
              <p className="text-sm text-slate-700 bg-brand-50/40 border border-brand-100 rounded-xl p-3 leading-relaxed">
                {lead.ai_summary}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                Özet henüz hazır değil (Gemini cevabı bekleniyor).
              </p>
            )}
          </section>

          {/* Iletisim + kalifikasyon */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Bilgiler
            </h3>
            <dl className="grid grid-cols-3 gap-y-2 gap-x-3 text-sm">
              <dt className="text-slate-500">E-posta</dt>
              <dd className="col-span-2 text-slate-800 break-all">{lead.email}</dd>

              {lead.phone && (
                <>
                  <dt className="text-slate-500">Telefon</dt>
                  <dd className="col-span-2 text-slate-800">{lead.phone}</dd>
                </>
              )}

              {lead.intent && (
                <>
                  <dt className="text-slate-500">Niyet</dt>
                  <dd className="col-span-2 text-slate-800">{lead.intent}</dd>
                </>
              )}

              {lead.volume && (
                <>
                  <dt className="text-slate-500">Hacim</dt>
                  <dd className="col-span-2 text-slate-800">{lead.volume}</dd>
                </>
              )}

              {lead.current_tool && (
                <>
                  <dt className="text-slate-500">Şu anki çözüm</dt>
                  <dd className="col-span-2 text-slate-800">{lead.current_tool}</dd>
                </>
              )}

              {lead.timeline && (
                <>
                  <dt className="text-slate-500">Zaman</dt>
                  <dd className="col-span-2 text-slate-800">{lead.timeline}</dd>
                </>
              )}

              <dt className="text-slate-500">Konuşma</dt>
              <dd className="col-span-2 text-slate-800">
                {lead.conversation_duration_sec
                  ? `${lead.conversation_duration_sec} sn`
                  : "—"}
              </dd>

              <dt className="text-slate-500">Tarih</dt>
              <dd className="col-span-2 text-slate-800">{formatDate(lead.created_at)}</dd>
            </dl>
          </section>

          {/* Skor breakdown */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Skor Detayı
            </h3>
            {lead.score_breakdown.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Skor detayı yok.</p>
            ) : (
              <ul className="space-y-1.5">
                {lead.score_breakdown.map((row, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="text-slate-700">{row.reason}</span>
                    <span
                      className={cn(
                        "font-mono font-semibold tabular-nums",
                        row.delta > 0 ? "text-green-700" : "text-red-700",
                      )}
                    >
                      {row.delta > 0 ? `+${row.delta}` : row.delta}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between text-sm rounded-lg bg-slate-900 text-white px-3 py-2 mt-2">
                  <span>Toplam</span>
                  <span className="font-mono font-semibold tabular-nums">{lead.score}</span>
                </li>
              </ul>
            )}
          </section>

          {/* Transkript */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Konuşma Transkripti
            </h3>
            {lead.transcript.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Transkript boş.</p>
            ) : (
              <div className="space-y-2">
                {lead.transcript
                  .filter((m) => m.role !== "system")
                  .map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                        m.role === "user"
                          ? "ml-auto bg-brand-600 text-white rounded-tr-md"
                          : "mr-auto bg-slate-100 text-slate-700 rounded-tl-md",
                      )}
                    >
                      {m.content}
                    </div>
                  ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer: status + kopyala */}
        <footer className="border-t border-slate-200 p-4 bg-slate-50/50 space-y-3">
          <div>
            <label
              htmlFor="lead-status"
              className="block text-xs font-medium text-slate-500 mb-1"
            >
              Durum
            </label>
            <select
              id="lead-status"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as LeadRow["status"])}
              disabled={saving}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
          >
            {copied ? "✓ Kopyalandı" : "Bilgileri kopyala"}
          </button>
        </footer>
      </aside>
    </>
  );
}
