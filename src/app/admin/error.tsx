"use client";

/**
 * Admin sayfasi error boundary'si.
 * Supabase erisim hatasi gibi durumlarda kalan UI'i bozmaz.
 */
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/error.tsx]", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto rounded-2xl bg-white ring-1 ring-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Admin paneli yüklenemedi
        </h1>
        <p className="text-sm text-slate-600 mb-5">
          Veritabanı bağlantısında bir sorun olmuş olabilir. Tekrar deneyin;
          sürerse <code className="font-mono text-xs">.env.local</code>{" "}
          değişkenlerini kontrol edin.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 transition"
        >
          Yeniden yükle
        </button>
        {error.digest && (
          <p className="mt-4 text-xs text-slate-400 font-mono">
            ref: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
