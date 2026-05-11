# NextReach Chatbot — Claude Code Talimatlari

Bu dosya, projeyi gelistirirken Claude'un (veya baska bir AI asistanin) uyacagi kurallari icerir.
Her oturum basinda otomatik yuklenir.

---

## Proje Ozeti

NextReach, orta olcekli e-ticaret firmalarina analitik dashboard sunan bir B2B SaaS sirketi.
Landing page'deki "Contact Sales" formunun conversion'i dustugu icin, formu **konusan bir chatbot**
ile degistiriyoruz.

**Hedef:** Ziyaretciyi sicakkanli karsilayan, 4-5 soruda nitelikli bir lead olusturan
ve satis ekibinin admin panelden gorebilecegi bir sistem. **6 saat hard limit.**

---

## Tech Stack ve Sebepleri

| Katman | Secim | Neden |
|---|---|---|
| Framework | Next.js 15 App Router | Frontend+Backend tek repoda, Vercel ile sifir-config deploy |
| Dil | TypeScript (strict) | Hata yakalama, IDE deneyimi, kod gozden gecirme kolayligi |
| Styling | Tailwind CSS | 6 saatte CSS yazmaya zaman yok, prod-ready |
| DB | Supabase (Postgres) | Hosted, ucretsiz, dashboard hediye, realtime |
| AI | Google Gemini 2.0 Flash | Hizli, ucuz, kullanicinin API key'i mevcut |
| Validation | Zod | Frontend ve backend'de paylasilan sema |
| Deploy | Vercel | Next.js'in dogal yuvasi |

---

## Kod Standardlari

1. **TypeScript strict mode** — `any` kullanma.
2. **Server vs Client komponent ayrimini ciddiye al.** Gereksiz `"use client"` koyma.
3. **Server-only kod** (Supabase service_role, Gemini API) **asla client'a sizmasin.**
4. **Env okuma** — `process.env.X` icin yardimci `lib/env.ts` kullan (varsa).
5. **API route'lar Zod ile valide etsin** — backend'de asla `body.x` direkt kullanma.
6. **Hata mesajlari kullaniciya Turkce, log'larda Ingilizce/teknik.**
7. **Erisilebilirlik (a11y):** `aria-label`, klavye navigasyonu, focus stilleri.
8. **Mobil ilk** — Tailwind'in `sm:` `md:` breakpoint'leriyle.

---

## Chatbot Akisi (Karar)

```
1. Selamlama          -> Niyet keşfi (demo / fiyat / entegrasyon)
2. Kimlik (zorunlu)   -> Isim + Sirket + Is e-postasi
3. Kalifikasyon       -> Hacim + Su anki cozumu
4. Aciliyet (ops.)    -> Ne zaman ilerlemek istiyor
5. Ozet + Onay        -> Kaydet, "satis ekibi 24h icinde donecek"
```

**"Yeter" noktasi:** Adim 3 tamamlandiginda lead gecerli sayilir. 4-5 opsiyonel.

---

## Lead Scoring (Karar)

`src/lib/scoring/score.ts` icinde implement edildi.
Skor breakdown'i veritabaninda saklaniyor ki satis ekibi *neden* o skoru aldigini gorsun.

- **80-100** Hot (yesil / acil)
- **50-79**  Warm (sari)
- **0-49**   Cold (gri)

---

## Klasor Yapisi

```
src/
  app/
    layout.tsx              -> Root layout (Inter font, tr lang)
    page.tsx                -> Landing
    globals.css             -> Tailwind + global stiller
    admin/page.tsx          -> Admin view (ADMIN_SECRET_KEY ile korumali)
    api/
      chat/route.ts         -> POST Gemini ile konusma (edge runtime)
      leads/route.ts        -> POST kaydet / GET listele
  components/
    chatbot/                -> Chatbot UI parcalari
    admin/                  -> Admin tablo, detay panel
    landing/                -> Hero, CTA, footer
    ui/                     -> Genel butonlar, inputs
  lib/
    db/supabase.ts          -> Browser + server client'lar
    ai/gemini.ts            -> Gemini client + SYSTEM_PROMPT
    scoring/score.ts        -> Lead scoring kurallari
    utils.ts                -> cn() ve yardimci fonksiyonlar
  types/
    lead.ts                 -> Lead, ChatMessage tipleri

supabase/
  schema.sql                -> Tablolar + indeksler + RLS

docs/                       -> Mimari notlari, kararlar
public/                     -> Statik dosyalar (logo vs)
```

---

## "Yapmadiklarim" Listesi (Bu Skopta)

- Auth sistemi (admin'e ADMIN_SECRET_KEY ile erisiliyor)
- E-posta/SMS bildirimi (sadece DB'ye yaziyoruz)
- Mobil native uygulama (web mobil-responsive yeterli)
- Coklu dil (sadece TR)
- Karmasik analitik (dashboard'da basit sayilar yeter)

---

## Build / Run Komutlari

```bash
npm install
npm run dev       # http://localhost:3000
npm run typecheck # TypeScript hatalari
npm run lint
npm run build
```

---

## Zaman Cizelgesi (6h Hard Limit)

| Saat | Is |
|---|---|
| 0:00 - 0:30 | Repo + Supabase + .env setup, ilk commit |
| 0:30 - 1:15 | Iskelet hazirlik (su anki durum) |
| 1:15 - 3:00 | Chatbot core: UI + state machine + Gemini |
| 3:00 - 3:45 | Lead scoring + Supabase yazma + AI ozet |
| 3:45 - 4:45 | Admin view: tablo + detay paneli |
| 4:45 - 5:15 | Landing page tasarimi |
| 5:15 - 5:45 | Spam savunma + Vercel deploy |
| 5:45 - 6:00 | README (en kritik 15dk) |
