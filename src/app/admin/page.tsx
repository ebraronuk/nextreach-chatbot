/**
 * Admin Dashboard sayfasi.
 *
 * Erisim: /admin?key=<ADMIN_SECRET_KEY>
 * - Server Component: key dogrula + Supabase'ten lead'leri cek
 * - Client AdminDashboard'a aktar: filtre + detay panel state'i orada
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerClient, type LeadRow } from "@/lib/db/supabase";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const params = await searchParams;
  const expected = process.env.ADMIN_SECRET_KEY;

  if (!expected || params.key !== expected) {
    redirect("/");
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[/admin] supabase select error", error);
  }

  const leads = (data ?? []) as LeadRow[];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Lead Yönetimi</h1>
            <p className="text-sm text-slate-500">
              Toplam {leads.length} lead · skor sırasıyla
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-800 transition"
          >
            ← Ana sayfa
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {leads.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-700 font-medium mb-1">Henüz lead yok.</p>
            <p className="text-sm text-slate-500">
              Konuşan ziyaretçiler burada belirecek.
            </p>
          </div>
        ) : (
          <AdminDashboard initialLeads={leads} adminKey={params.key!} />
        )}
      </div>
    </main>
  );
}
