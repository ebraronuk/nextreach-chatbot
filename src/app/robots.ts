import type { MetadataRoute } from "next";
import { clientEnv } from "@/lib/env";

/**
 * /robots.txt — Next.js 15 file-based metadata.
 *
 * Admin endpoint'i query-param secret ile korunsa da arama motorlarinin
 * URL'i indekslemesini istemiyoruz. /api/* tarafi public API degil; sadece
 * client tarafindan cagrilan internal route'lar.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? "https://nextreach-chatbot.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
