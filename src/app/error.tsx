"use client";

/**
 * Top-level error boundary.
 * Bilinmeyen client/server hatasinda kullaniciya nazik bir ekran gosterir.
 */
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error.tsx]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md text-center rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-100 mb-4">
          Beklenmedik bir hata
        </p>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Ufak bir terslik oldu.
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Sayfayı yenilemeyi deneyebilirsiniz. Sorun sürerse satış ekibine
          chatbot üzerinden ulaşabilirsiniz.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 transition"
          >
            Tekrar dene
          </button>
          <Link
            href="/"
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Ana sayfa
          </Link>
        </div>
        {error.digest && (
          <p className="mt-5 text-xs text-slate-400 font-mono">
            ref: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
