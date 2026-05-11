import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "NextReach — E-ticaret Analitik Platformu",
  description:
    "Orta olcekli e-ticaret firmalari icin gercek zamanli analitik dashboard. Konusarak iletisim kurun, dakikalar icinde demo alin.",
  openGraph: {
    title: "NextReach",
    description: "E-ticaret operasyonunuzu veriyle yonetin.",
    type: "website",
  },
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
