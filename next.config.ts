import type { NextConfig } from "next";

/**
 * Production security headers.
 *
 * - CSP: scriptler same-origin + Vercel telemetry; inline'a unsafe-inline gerekli
 *   cunku Next.js inline hydration script enjekte ediyor. Tighter bir CSP icin
 *   nonce-based yaklasim gerek (production'da onerilir).
 * - HSTS: HTTPS zorla.
 * - X-Frame-Options: clickjacking onleme.
 * - Referrer-Policy: kullanici verisi sizdirmama.
 * - Permissions-Policy: gereksiz tarayici API'larini kapatma.
 */
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    // Production-icin baselina CSP. Gemini ve Supabase domainlerine connect izni.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
