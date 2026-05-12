# Performans Notları — 5 Hızlı Win

Üretimde `nextreach-chatbot.vercel.app` için ölçülen sorunlar ve müdahaleler.
Her madde **Tespit yöntemi** + **Çözüm** ikilisiyle yazıldı; kod blokları
copy-paste edilebilir.

> Genel ölçüm aracı: `npm run build` çıktısının altındaki Route (App) tablosu
> ("First Load JS") + Vercel Speed Insights + Chrome DevTools **Lighthouse**
> ve **Performance > Web Vitals** sekmesi.

---

## 1. Admin sayfası ~177 kB First Load JS

### Sorun tespiti

```bash
# Bundle'in icinde ne var, gor.
ANALYZE=true npm run build
# veya
npx @next/bundle-analyzer
```

`next.config.ts` icine gecici olarak:

```ts
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default bundleAnalyzer(nextConfig);
```

Browser'da `.next/analyze/client.html` acilir; `/admin` chunk'inda en buyuk
payi kim aliyor goruntulenir.

**Bu projedeki suclular (yuksek olasilikla):**

- `lucide-react` — barrel export. `import { RefreshCcw } from "lucide-react"`
  yazsan bile bundler her ikon SVG'sini tarama riski. Hem `AdminDashboard`
  hem `LeadDetailPanel` hem `FiltersBar` `lucide-react`'ten cektigi icin
  carpan etkili.
- `@supabase/supabase-js` browser client'i tum admin sayfasina taasniyor.
- `@google/generative-ai` — sadece API route'larda kullaniliyor, **client'a
  hic sizmamali**. `lib/ai/gemini.ts` yanlislikla client'tan import edilirse
  sizar; kontrol et.

### Cozum

**A) `optimizePackageImports` ile lucide tree-shake:**

```ts
// next.config.ts
const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // ... mevcut headers() ayni kalir
};
```

Bu, Next.js 15'in lucide'i icon-basina chunk'a bolmesini saglar.
**Genelde 20-40 kB kazanc.**

**B) Detay panelini lazy-load et:**

`LeadDetailPanel` ancak bir lead seciliyken render ediliyor.
Static import yerine dinamik import:

```tsx
// src/components/admin/AdminDashboard.tsx
import dynamic from "next/dynamic";

const LeadDetailPanel = dynamic(
  () => import("./LeadDetailPanel").then((m) => m.LeadDetailPanel),
  { ssr: false }, // server'da render edilmesine gerek yok, modal
);
```

İlk paint'ten cikar, sadece kullanici lead'e tikladiginda yuklenir.

**C) `lib/ai/gemini.ts`'in client'a kacip kacmadigini grep'le:**

```bash
# Bu komut bos donmeli — yoksa server-only kod client'a sizmis.
grep -rn 'from "@/lib/ai/gemini"' src/components src/app/admin
```

Sizinti varsa, dosyanin en ustune `import "server-only";` ekleyip build
hatasinda yakalayabilirsin (`server-only` paketi `npm i server-only`).

**Hedef:** First Load JS < 140 kB (yaklasik 35 kB tasarruf).

---

## 2. Inter font — Google Fonts -> next/font self-host

### Sorun tespiti

```bash
# Production HTML'inde fonts.googleapis.com referansi kalmis mi?
curl -sI https://nextreach-chatbot.vercel.app | grep -i link
curl -s https://nextreach-chatbot.vercel.app | grep -Eo 'fonts\.(googleapis|gstatic)\.com[^"]*'
```

Lighthouse'da **"Eliminate render-blocking resources"** veya **"Preload key
requests"** uyarisi cikiyorsa, font yukleme zinciri optimize degil.

**Iyi haber:** Bu proje `src/app/layout.tsx`'de zaten `next/font/google`
kullaniyor — font Vercel'in CDN'inden self-host ediliyor, **Google'a
istek atilmiyor**. Yani build zamaninda indirilip `/_next/static/media/...`
altina kopyalaniyor.

**Yine de iki acik:**
1. `next.config.ts` icindeki CSP hala `fonts.googleapis.com` ve
   `fonts.gstatic.com` izinleri tasiyor — kullanilmiyor, gereksiz attack
   surface.
2. Font `display: "swap"` ve `preload: true` opsiyonlari ile **FOIT**
   (flash of invisible text) ve LCP ertelemesi azaltilabilir.

### Cozum

`src/app/layout.tsx`:

```ts
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",         // FOIT yerine FOUT — LCP hemen render olur
  preload: true,            // <link rel="preload"> otomatik
  adjustFontFallback: true, // CLS azaltma: fallback ile metric esle
});
```

`next.config.ts` CSP'sinden Google Fonts izinlerini cikar:

```ts
"style-src 'self' 'unsafe-inline'",          // fonts.googleapis.com kaldirildi
"font-src 'self' data:",                      // fonts.gstatic.com kaldirildi
```

**Etki:** LCP ~100-200 ms, CLS 0.01-0.05 kazanim; CSP daha sikilasir.

---

## 3. ProactiveBubble animasyonu ve CLS

### Sorun tespiti

```bash
# Chrome DevTools > Performance > "Web Vitals" sat¦riyla kayit al
# Sayfaya gir, 4-5 sn bekle (bubble icin), CLS spike'larini gor.
```

Programatik olarak `web-vitals` ile loglamak da mumkun:

```ts
// src/app/layout.tsx (gecici)
"use client";
import { onCLS, onLCP, onINP } from "web-vitals";
onCLS(console.log);
onLCP(console.log);
onINP(console.log);
```

`src/components/chatbot/ProactiveBubble.tsx:79` — bubble `fixed bottom-24
right-6` ile konumlanmis, **document flow'unun disinda**. Teknik olarak
DOM agacindaki diger elemanlari kaydirmadigi icin CLS skorunu
**etkilememesi gerekir**. Risk noktalari:

- Animasyon `animate-fade-in-up` `height`/`top` degil; `transform` +
  `opacity` kullaniyorsa CLS = 0.
- Render'dan once 4 sn `setTimeout` var; ilk paint sirasinda DOM'da yok,
  sonra ekleniyor — yine `fixed` oldugu icin shift yok, **ama** mobilde
  `hidden sm:flex` ile gizleniyor; viewport resize'da gozukup kaybolursa
  sicrama yapabilir.

Asil masraf **CPU** olabilir: bubble gozuktugu anda `box-shadow` + ring
+ gradient + filter karmasinin compositor maliyeti INP'yi (etkilesim
gecikmesi) artirabilir.

### Cozum

`tailwind.config.ts`'te `fade-in-up` keyframe'inin `transform` ve `opacity`
disinda hicbir sey degistirmedigini dogrula. Ornek guvenli tanim:

```ts
// tailwind.config.ts
theme: {
  extend: {
    keyframes: {
      "fade-in-up": {
        "0%":   { opacity: "0", transform: "translateY(8px)" },
        "100%": { opacity: "1", transform: "translateY(0)" },
      },
    },
    animation: {
      "fade-in-up": "fade-in-up 220ms cubic-bezier(0.16, 1, 0.3, 1) both",
    },
  },
},
```

Component'te compositor ipuclari + reduced-motion saygi:

```tsx
// ProactiveBubble.tsx — root div
<div
  className="hidden sm:flex fixed bottom-24 right-6 z-30 flex-col items-end
             pointer-events-none animate-fade-in-up
             motion-reduce:animate-none
             [will-change:transform,opacity]
             [contain:layout_paint]"
  aria-live="polite"
>
```

- `will-change` GPU layer'a yukseltir, repaint maliyetini azaltir.
- `contain: layout paint` bubble'in icindeki repaint'lerin disari sizmasini
  engeller; INP'yi korur.
- `motion-reduce:animate-none` erisilebilirlik + dusuk-guc cihazlarda
  jank engeli.

Ek olarak fixed konum yerine bubble'i bir **portal** icine almak gerekmiyor;
zaten `fixed` ile DOM hierarchy'den bagimsiz.

---

## 4. Vercel Analytics — free tier kurulumu

### Sorun tespiti

Su anda `nextreach-chatbot.vercel.app`'te hicbir analytics yok.
Lead conversion'ini (kac ziyaretci -> kac chat -> kac form submit) gormek
icin minimum `@vercel/analytics` + `@vercel/speed-insights` yeterli.

### Cozum

```bash
npm i @vercel/analytics @vercel/speed-insights
```

`src/app/layout.tsx` icine ekle:

```tsx
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className="font-sans antialiased bg-white text-slate-900">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

`next.config.ts` CSP'sinde `script-src` zaten `https://va.vercel-scripts.com`
icin acik — ekstra ayar gerekmiyor.

**Custom event'ler (lead submit gibi):**

```ts
// src/components/chatbot/Chatbot.tsx
import { track } from "@vercel/analytics";

// lead basariyla kaydolduktan sonra
track("lead_submitted", {
  temperature: lead.temperature,
  score: lead.score,
});
```

Mevcut `src/lib/analytics.ts` icindeki `track()` fonksiyonunu Vercel'in
`track()` ile wrap edebilirsin — hem console hem Vercel'e gider:

```ts
// src/lib/analytics.ts
import { track as vercelTrack } from "@vercel/analytics";

export function track(event: string, props?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") {
    console.log("[analytics]", event, props);
  }
  vercelTrack(event, props);
}
```

Free tier limitleri: 2.5k events/ay, 30 gun retention. Hot lead conversion
funnel'i icin yeterli.

---

## 5. Sentry kurulumu — Next.js 15 App Router

### Sorun tespiti

API route'larda (`/api/chat`, `/api/leads`) hata oldugunda sadece Vercel
Function logs'a dusuyor. Stack trace + breadcrumb + release tracking yok.
Production'da gercek bir hata olunca debug zor.

### Cozum

```bash
npx @sentry/wizard@latest -i nextjs
```

Wizard interaktif; uretecegi dosyalar (manuel olarak da yazilabilir):

**`sentry.client.config.ts`** (browser-side):

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,           // %10 transaction sample
  replaysSessionSampleRate: 0,     // session replay kapat (free tier kotasi)
  replaysOnErrorSampleRate: 1.0,   // sadece hata aninda replay
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
  environment: process.env.NODE_ENV,
});
```

**`sentry.server.config.ts`** (Node runtime):

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

**`sentry.edge.config.ts`** (Edge runtime — `/api/chat` icin):

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

**`next.config.ts` wrapper:**

```ts
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: { optimizePackageImports: ["lucide-react"] },
  async headers() { /* mevcut SECURITY_HEADERS */ },
};

export default withSentryConfig(nextConfig, {
  org: "nextreach",
  project: "chatbot",
  silent: !process.env.CI,
  widenClientFileUpload: true,    // source map upload server-side icin
  hideSourceMaps: true,            // source map'i public'e basma
  disableLogger: true,             // bundle size icin Sentry logger'i cikar
  automaticVercelMonitors: true,   // Vercel Cron monitor'leri otomatik
});
```

**Env var'lar (Vercel dashboard):**

```
NEXT_PUBLIC_SENTRY_DSN=https://...@o0.ingest.sentry.io/0
SENTRY_DSN=https://...@o0.ingest.sentry.io/0
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=nextreach
SENTRY_PROJECT=chatbot
```

**CSP'yi guncelle:**

```ts
// next.config.ts SECURITY_HEADERS icindeki CSP
"connect-src 'self' https://*.supabase.co wss://*.supabase.co " +
  "https://generativelanguage.googleapis.com " +
  "https://*.ingest.sentry.io",  // <-- ekle
```

**API route'larda manuel kullanim:**

```ts
// src/app/api/leads/route.ts
import * as Sentry from "@sentry/nextjs";

try {
  // ... mevcut lead insert
} catch (err) {
  Sentry.captureException(err, {
    tags: { route: "leads.POST" },
    extra: { score: lead.score, temperature: lead.temperature },
  });
  return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
}
```

Free tier: 5k errors/ay + 10k performance units. Bu hacimde fazlasiyla
yetiyor.

---

## Olcum ozeti — onceden / sonradan beklenti

| Metrik             | Once    | Sonra (hedef) | Yontem                    |
|--------------------|---------|---------------|---------------------------|
| `/admin` First Load JS | ~177 kB | ~135 kB       | optimizePackageImports + dynamic import |
| Landing LCP        | ?       | < 1.8 s       | font display:swap + preload |
| CLS                | ?       | < 0.05        | contain:layout + will-change |
| INP                | ?       | < 200 ms      | reduced-motion + GPU layer |
| Observability      | yok     | full          | Vercel Analytics + Sentry  |

Her madde **tekil PR** olarak gidebilir — boylelikle Speed Insights'ta
delta tek tek olculur. Sirayla: 2 -> 4 -> 1 -> 3 -> 5 (kazanc x risk
oraniyla).
