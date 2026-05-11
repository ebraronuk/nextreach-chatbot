# NextReach Chatbot

> Landing page ziyaretcisini sicakkanli bir konusmayla karsilayan, **nitelikli lead** olusturan ve satis ekibine pratik bir admin panel sunan chatbot.

**Stajyer degerlendirme gorevi — 6 saat hard limit.**

---

## Demo

- Canli: _(deploy edildiginde buraya Vercel URL'i)_
- Admin: `/admin?key=<ADMIN_SECRET_KEY>`

---

## Hizli Baslangic (Local)

### 1) Bagimliliklari kur

```bash
npm install
```

### 2) Environment dosyalarini hazirla

`.env.example`'i `.env.local` olarak kopyala ve degerleri doldur:

```bash
cp .env.example .env.local
```

Gerekli anahtarlar:

| Anahtar | Nereden alinir |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ayni yer (anon public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Ayni yer (service_role — gizli!) |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |
| `ADMIN_SECRET_KEY` | Sen uydur, kuvvetli olsun |

### 3) Supabase tablolarini olustur

`supabase/schema.sql` icerigini Supabase Dashboard > SQL Editor'a yapistir ve `Run` tikla.

### 4) Calistir

```bash
npm run dev
# http://localhost:3000
```

---

## Teknoloji Secimi ve Gerekceler

| Katman | Karar | Neden |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Frontend + Backend ayni repoda, Vercel'de sifir-config deploy. 6 saatlik limitte iki ayri sunucu kurmak luks. |
| **Dil** | TypeScript (strict) | Lead semasi gibi paylasilan tiplerde derleyici guvencesi, IDE deneyimi, code review kolay. |
| **UI** | Tailwind CSS | Utility-first; CSS dosyasi yazmadan profesyonel UI. shadcn/ui pattern'iyle uyumlu. |
| **DB** | Supabase (Postgres) | Hosted, ucretsiz tier, hediye gelen dashboard "backup admin view" gorevi goruyor. Realtime kanalla admin'de canli lead bildirimi. |
| **AI** | Google Gemini 2.0 Flash | Hizli, ucuz, Turkce kaliteli. Sadece kural-tabanli chatbot 2026'da artik kabul edilemez. |
| **Validation** | Zod | Client + server'da paylasilabilen sema, runtime'da guvenli body parse. |
| **Hosting** | Vercel | Next.js'in dogal yuvasi, preview deploy, GitHub entegrasyonu. |

---

## Urun Kararlari (PRD'deki Muglak Yerleri Nasil Yorumladim)

### Chatbot Kisiligi: "Aylin"
- **Ton:** Profesyonel-sicak. Soguk satisci degil, danisman.
- **Kapsam:** Dogrudan fiyat vermez ("paketler ihtiyaca gore"), teknik derinlige inmez (bir uzman geri donecek).
- **Dil:** Turkce, "siz" hitabi, kisa cumleler, max 1-2 emoji.

### Konusma Akisi (4-5 adim)
1. Selamlama + niyet kesfi (demo / fiyat / entegrasyon)
2. Isim + Sirket + is e-postasi
3. Aylik siparis hacmi + su anki cozumu
4. Aciliyet / zaman cizelgesi (opsiyonel)
5. Ozet + onay -> kaydet

**"Yeter" noktasi:** 3. adim tamamlaninca lead gecerli. 4. opsiyonel.

### Iyi vs Kotu Lead Ayrimi (Scoring)

| Faktor | Etki |
|---|---|
| Kurumsal e-posta (gmail/hotmail degil) | +25 |
| Aylik siparis 5k+ | +30 |
| Aylik siparis 500-5k | +15 |
| Zaman: bu hafta / bu ay | +25 |
| Rakip arac kullaniyor (gecis adayi) | +20 |
| Konusma 30sn'den kisa | -15 |

**80+ Hot 🔥 / 50-79 Warm / <50 Cold**

Skor breakdown'i DB'de saklaniyor — satis ekibi *neden* skorunu gorebiliyor.

### Admin View
- `/admin?key=<gizli>` ile erisim (auth out of scope, basit koruma)
- Tablo: skor + isim/sirket + email + niyet + zaman + status
- Satira tiklayinca: tam transkript + AI ozeti + skor breakdown
- Filtre: durum, sicaklik, tarih
- Realtime: yeni lead anlik dusuyor

### Spam Savunmasi (Cok Katmanli)
1. Honeypot field — bot doldurursa rejected
2. IP basina rate limit (10dk/3 submission)
3. Minimum konusma suresi (<30sn = flag)
4. Email format + disposable domain kontrolu
5. Server-side validation (Zod) — frontend kontrolune guvenmem

### Ziyaretci Cevap Vermek Istemezse?
- Kimlik bilgisi (1-2. adim): Bir kez nazikce yeniden iste, hala reddederse cikis ekrani.
- Diger sorular: Atlat, notla. Satis ekibi "ziyaretci X'i atlamis" gorur.

---

## 6 Saatte Yapilabildi / Yapilamadi

### Yapildi
- [ ] _(implementasyon ilerledikce isaretlenecek)_

### Yapilamadi (vakit kalmadi)
- [ ] _(burada listelenecek)_

---

## Daha Fazla Zaman Olsaydi

- **Coklu kanal**: Slack / email bildirimleri (webhook altyapisi hazir, sadece UI eksik)
- **CRM entegrasyonu**: HubSpot / Pipedrive otomatik lead push
- **A/B testi altyapisi**: Konusma akisinin farkli varyantlarini olcmek
- **Sesli mesaj**: Gemini Multimodal ile voice input
- **Coklu dil**: Otomatik dil tespiti + cevap
- **Takim uye yonetimi**: Admin'de assigned-to, notes, follow-up date
- **Drop-off analytics**: Hangi soruda kullanicilar konusmayi biraktiyor?
- **CSV/Excel export**: Sales icin
- **Daha sofistike spam tespiti**: Cloudflare Turnstile, davranissal sinyaller

---

## Mimari (Yuksek Seviye)

```
[ Ziyaretci ]
     |
     v
[ Next.js Landing Page ]  ---> [ Chatbot Component (client) ]
                                   |
                                   v   POST /api/chat
                            [ Edge Function ] ---> [ Gemini API ]
                                   |
                                   v   POST /api/leads (bitince)
                            [ Node Function ]
                                   |  - Zod validation
                                   |  - Lead scoring
                                   |  - AI summary
                                   v
                            [ Supabase (Postgres) ]
                                   |
                                   v  (realtime)
                            [ /admin sayfasi ]
```

---

## Toplam Sure: _XX saat YY dakika_

_(commit history'den dogrulanabilir)_

---

## Lisans

MIT
