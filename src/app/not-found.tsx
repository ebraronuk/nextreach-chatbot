/**
 * 404 sayfasi. Yanlis admin key'i yazan kisi anasayfaya redirect oluyor;
 * baska bilinmeyen yollar buraya dusuyor.
 */
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Sayfa bulunamadı
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Aradığınız sayfa taşınmış ya da hiç olmamış olabilir.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 transition"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
