import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nextreach-chatbot.vercel.app";
const siteName = process.env.NEXT_PUBLIC_APP_NAME ?? "NextReach";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — E-ticaret Analitik Platformu`,
    template: `%s · ${siteName}`,
  },
  description:
    "Orta olcekli e-ticaret firmalarina gercek zamanli sipariş, stok ve müşteri analitigi. Soguk form yerine konusarak ekibimize ulasin — dakikalar icinde doğru kişiyle eslesin.",
  applicationName: siteName,
  authors: [{ name: siteName }],
  keywords: [
    "e-ticaret",
    "analitik dashboard",
    "B2B SaaS",
    "lead qualification",
    "AI chatbot",
    "satıs otomasyonu",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: siteUrl,
    siteName,
    title: `${siteName} — E-ticaret Analitik Platformu`,
    description:
      "Konusan bir chatbot ile dakikalar icinde satıs ekibimizle baglantı kurun. NextReach 300+ marka tarafından kullanılıyor.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — E-ticaret Analitik Platformu`,
    description: "Sıcak bir sohbetle nitelikli leadler — soguk formlara veda edin.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className="font-sans antialiased bg-white text-slate-900">
        {children}
      </body>
    </html>
  );
}
