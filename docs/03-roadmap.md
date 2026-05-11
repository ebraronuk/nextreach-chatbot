# Development Roadmap — NextReach Chatbot

> Kalan zamanin saat-saat plani. Her gorev tick'lenebilir.
> Su an: **iskelet hazir, kodlama baslamadi.**

---

## Su Anki Durum (Bootstrap Tamam)

- [x] Next.js 15 + TypeScript + Tailwind kuruldu
- [x] Klasor yapisi (`src/app`, `src/components`, `src/lib`, `src/types`)
- [x] Supabase + Gemini client iskeletleri yazildi
- [x] Lead scoring algoritmasi yazildi (test edilmedi)
- [x] Tipler tanimlandi (`Lead`, `ChatMessage`, `Volume`, `Timeline`)
- [x] `.env.local` doldu, `.gitignore` korumada
- [x] Supabase schema.sql hazir
- [x] CLAUDE.md + README.md skeleton var
- [x] docs/ icinde tasarim ve akis planlari yazildi

**Hala bekleyen:** `npm install` calistirilmadi, Supabase tablolari olusturulmadi, GitHub repo'su acilmadi.

---

## Faz 0 — Kurulum (HEMEN ŞIMDI, ~15 dk)

- [ ] `npm install` calistir
- [ ] Supabase Dashboard → SQL Editor → `supabase/schema.sql` yapistir → Run
- [ ] Supabase Table Editor → `leads` tablosunu gor (bos olmali)
- [ ] `npm run dev` calistir, http://localhost:3000 acilsin
- [ ] Sag alttaki "Bize Ulasin" butonu goruluyor mu? (placeholder modal acmali)
- [ ] GitHub: yeni public repo `nextreach-chatbot` ac (README/license/gitignore EKLEME)
- [ ] `git remote add origin <URL>` + ilk commit + `git push -u origin main`
- [ ] Vercel → Import GitHub repo → tum env'leri Vercel'e kopyala → Deploy
- [ ] Vercel canli URL'i README'ye yaz

**Beklenen sure: 15-20 dk. Bittiginde "Faz 0 tamam" de.**

---

## Faz 1 — Chatbot Engine (90 dk)

> En kritik faz. Kullaniciya gosterilecek esas ozellik.

### 1.1 Chat state ve UI (30 dk)
- [ ] `src/components/chatbot/Chatbot.tsx`'i gercek mesaj listesi ile guncelle
- [ ] `messages` state'i: `Array<{role, content, timestamp, options?}>`
- [ ] `step` state'i: greeting | identity | qualification | timeline | summary | submitted
- [ ] `leadData` state'i: toplanan tum veriler
- [ ] Mesaj balonlari (design-system'deki stillerle)
- [ ] Quick reply chip butonlari
- [ ] "Aylin yaziyor..." typing indicator (3 nokta pulse)
- [ ] Scroll: yeni mesaj geldikce otomatik dibe in
- [ ] Modal animasyonu: `animate-slide-up`
- [ ] Escape ile kapanma + odak yonetimi (a11y)
- [ ] Mobile: tam ekran bottom sheet
- [ ] localStorage: konusma kaybolmasin (refresh direncli)

### 1.2 Conversation engine (40 dk)
- [ ] `src/lib/conversation/flow.ts` — step gecislerini yoneten machine
- [ ] Validasyon: isim, sirket, email (Zod)
- [ ] Kurumsal email kontrolu + uyari mesaji
- [ ] "Atla" / "Daha sonra" yanitlarini handle et
- [ ] Reddedis senaryolari (1. red yumusak yeniden iste, 2. red kabul)

### 1.3 Gemini entegrasyonu (20 dk)
- [ ] `POST /api/chat` route'unu calistir
- [ ] Edge runtime + streaming response
- [ ] System prompt'a Aylin persona'sini koy
- [ ] Konusma gecmisini Gemini'ye gonder, akilli yanit al
- [ ] Off-topic / fiyat sorularinda Gemini'nin uygun cevap vermesi

**Faz 1 bitiminde:** ziyaretci sohbete girer, 5 adimi tamamlar, ekranda "Talebinizi olusturuyorum..." mesaji goruyor (henuz DB'ye yazilmiyor).

---

## Faz 2 — Lead Save + Scoring + AI Summary (45 dk)

### 2.1 Submit endpoint (20 dk)
- [ ] `POST /api/leads` Zod ile valide eder
- [ ] Honeypot kontrolu (dolu ise sessiz reddet)
- [ ] Rate limit (IP basina 10dk/3 submission, in-memory Map yeter)
- [ ] Lead scoring hesapla (`scoreLead()` cagir)
- [ ] Supabase'e yaz (`getServerClient()`)
- [ ] Hata: client'a 500 ama log'da gercek hata

### 2.2 AI ozet (15 dk)
- [ ] Submit'ten sonra Gemini'ye 2. cagri: ozet uret
- [ ] Ozeti `ai_summary` kolonuna yaz (async, lead kaydetmeyi bloklamadan)

### 2.3 Hot lead webhook (10 dk)
- [ ] Score >= 80 ise `HOT_LEAD_WEBHOOK_URL`'ye POST (varsa)
- [ ] Payload: `{ name, company, email, score, summary, url: /admin?key=... }`

**Faz 2 bitiminde:** ziyaretci konusmayi tamamlar, Supabase'te yeni lead satiri olusur.

---

## Faz 3 — Admin View (60 dk)

### 3.1 Tablo (30 dk)
- [ ] `src/app/admin/page.tsx` — Server Component, `getServerClient` ile lead'leri cek
- [ ] Tablo: skor / isim+sirket / email / niyet / zaman / status / created_at
- [ ] Skor rozetleri (Hot kirmizi / Warm sari / Cold gri)
- [ ] Sort: skor desc (default)
- [ ] Bos durum: "Henuz lead yok"

### 3.2 Detay panel (20 dk)
- [ ] Satira tikla → side drawer acilir
- [ ] AI ozeti en ustte
- [ ] Skor breakdown (her +/- madde)
- [ ] Tam transkript (mesaj balonlariyla)
- [ ] Status degistir (new → contacted → qualified / rejected)
- [ ] "Tum bilgileri kopyala" butonu

### 3.3 Filtre + realtime (10 dk)
- [ ] Filtre: status, temperature, tarih araligi
- [ ] Supabase Realtime: yeni lead satiri animasyonla belirir
- [ ] Toplam sayilar ust kismda (3 Hot / 5 Warm / 12 Cold)

**Faz 3 bitiminde:** /admin?key=... ekraninda lead'ler listeleniyor, detay aciliyor.

---

## Faz 4 — Landing Page (30 dk)

- [ ] `src/app/page.tsx` — gercek landing
- [ ] Header: NextReach logo + nav (basit)
- [ ] Hero: baslik + alt baslik + 2 CTA ("Bize Ulasin" + "Daha fazla bilgi")
- [ ] "Bize Ulasin" tikla → Chatbot acil (event veya state lift)
- [ ] Sosyal kanit bolumu: 3-4 placeholder logo / istatistik
- [ ] "Neden NextReach?" 3 sutun ozellik karti
- [ ] Footer (basit, copyright + kurum bilgisi)
- [ ] Tum bilesenler responsive

**Faz 4 bitiminde:** profesyonel gorunen bir landing var, chatbot orada.

---

## Faz 5 — Polish + Spam + Deploy Refresh (30 dk)

- [ ] Error boundary (Next.js `error.tsx`)
- [ ] Loading skeleton'lar
- [ ] Honeypot input formda gizli olarak (display:none, tabindex=-1)
- [ ] Disposable email domain blacklist (kisa liste yeter)
- [ ] Mobile test (Chrome DevTools cihazi)
- [ ] Vercel'e push, deploy refresh
- [ ] Canli URL'de tum akis end-to-end test

---

## Faz 6 — README Final (15 dk, ÇOK ÖNEMLI)

- [ ] Demo URL'i ekle
- [ ] Ekran goruntuleri / GIF (chatbot acik, admin)
- [ ] "Yapildi" listesi guncel
- [ ] "Yapilamadi" listesi: yumusak ama net
- [ ] "Daha fazla zaman olsaydi" bolumu (vizyon!)
- [ ] PRD'deki muglak yerlerin yorumlarini detaylandir
- [ ] Toplam sure (commit history ile ortusen)

---

## Toplam Zaman Hesabi

| Faz | Sure |
|---|---|
| Faz 0 (kurulum) | 15-20 dk |
| Faz 1 (chatbot) | 90 dk |
| Faz 2 (save + score) | 45 dk |
| Faz 3 (admin) | 60 dk |
| Faz 4 (landing) | 30 dk |
| Faz 5 (polish + deploy) | 30 dk |
| Faz 6 (README) | 15 dk |
| **Toplam** | **~285 dk = 4h 45dk** |

> Buffer'in var. Yine de **bitmek bilmeyen detay** kovalamayi birak — "perfect is enemy of done".

---

## Risk Listesi

| Risk | Erken uyari | Plan B |
|---|---|---|
| Gemini API yavas / down | 2. saat ortasinda fark et | Kural-tabanli fallback yanitlar |
| Supabase RLS hatasi | Ilk yazma denemesi 400/401 | Service_role anahtarini kontrol et |
| Vercel deploy basarisiz | 5. saat | `.env`'i Vercel'e kopyalamayi unutma |
| TS tip hatasi (geli��im sirasinda) | `npm run typecheck` ile yakala | `// @ts-expect-error` kullanma, duzelt |
| Mobile bozuk | Faz 4 sonu | DevTools'ta `iPhone 12 Pro` simulator'unde test |

---

## Tavsiyeler

1. **Her faz sonu commit at.** `git log` hikayen.
2. **`npm run dev` her zaman acik tut.** Hot reload arkadasin.
3. **Bug'a takilirsan max 10 dk ugras**, sonra "todo: fix later" yaz, devam.
4. **Polish'i sona birak.** Once isleyen sonra guzel.
5. **README icin son 15 dakikayi koru.** Onceki commit'lerden notlar topla.
