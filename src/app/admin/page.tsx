/**
 * Admin View — placeholder.
 *
 * Erisim: /admin?key=<ADMIN_SECRET_KEY>
 * Saat 03:45-04:45 araliginda gerceklenecek:
 *   - Lead listesi (skora gore renkli)
 *   - Detay paneli (transkript + AI ozeti)
 *   - Filtreler (skor, tarih, durum)
 *   - CSV export
 *   - Realtime guncelleme (Supabase Realtime)
 */
import { redirect } from "next/navigation";

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

  return (
    <main className="min-h-screen p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Lead Yonetimi</h1>
        <p className="text-slate-600">
          Buraya gercek tablo gelecek. Su an placeholder.
        </p>
      </div>
    </main>
  );
}
