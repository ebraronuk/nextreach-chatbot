"use client";

/**
 * Global error boundary.
 *
 * app/error.tsx layout icinde tetiklenen hatalari yakalar; global-error.tsx
 * bizzat root layout'taki hatalari yakalar (layout.tsx render edemese bile
 * bu dosya devreye girer). Bu yuzden minimal/standalone HTML donduruyoruz —
 * Inter font, Tailwind, hatta layout dependency yok.
 *
 * Next.js sadece production build'de bu dosyayi cagirir; dev'de hata stack
 * trace'i overlay'de gosterilir.
 */
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error.tsx]", error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          color: "#0f172a",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            textAlign: "center",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: "2rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <h1 style={{ fontSize: 20, margin: "0 0 0.5rem", fontWeight: 600 }}>
            Beklenmedik bir hata oluştu.
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 1.5rem" }}>
            Sayfayı yenilemeyi deneyebilirsiniz. Sorun sürerse satış ekibine
            chatbot üzerinden ulaşabilirsiniz.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 999,
              padding: "0.5rem 1.25rem",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Tekrar dene
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: "1.25rem",
                fontSize: 11,
                color: "#94a3b8",
                fontFamily: "monospace",
              }}
            >
              ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
