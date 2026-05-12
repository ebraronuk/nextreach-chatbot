# Geliştirme Yol Haritası — Genel Yapılış

> Bu doküman projenin **nasıl inşa edildiğini** özetler; bir status report değil,
> aynı task'a benzer bir projeyi sıfırdan kurmaya niyetlenen birinin takip edebileceği
> bir akış şeması olarak yazıldı.
>
> 6 saatlik bir B2B SaaS lead-qualification chatbot'unu (chat akışı + scoring +
> persistence + admin paneli + deploy + dokümantasyon) tek developer ile bitirmenin
> mantıklı sıralaması:

---

## Faz 0 — Karar verme + hesap kurulumları (~30 dk)

Kodlamadan önce halledilmesi gereken işler. Bunları orta zamanda araya sıkıştırmak
sonradan acılı bug'a dönüşür.

- **Tech stack kararı**
  - Framework, dil, DB, AI provider, hosting seçimleri — gerekçeli, README'ye
    yazılabilir biçimde
  - Bu projedeki seçimler: Next.js 15 App Router, TypeScript, Tailwind, Supabase
    (Postgres), Gemini 2.5 Flash, Vercel
- **Hesap açılışları**
  - Supabase (proje + DB password)
  - Google AI Studio (Gemini API key)
  - GitHub repo (boş, README/license/gitignore eklemeden)
  - Vercel (henüz deploy değil, sadece hesap hazır)
- **Plan dokümanları**
  - Konuşma akışı (chatbot ne soracak, hangi sırada, ne zaman "yeter")
  - Karakter / ton kararı (chatbot'un kişiliği)
  - Lead scoring formülü (hangi faktörler, hangi ağırlıklar)
  - Admin paneli mockup (KPI + tablo + detay)
  - Spam savunma stratejisi (kaç katmanlı, hangi katmanlar)

> **Kritik prensip:** kararları kodlamadan önce yazıya dök. Sonradan değiştirmek
> kolay; başlamadan önce vermek çok daha hızlı.

---

## Faz 1 — Proje iskeleti (~45 dk)

Boş repodan çalışan-ama-içi-yok bir Next.js uygulamasına kadar:

- `package.json`, `tsconfig.json`, `tailwind.config`, `postcss.config`,
  `next.config`, `.eslintrc.json` — config dosyalarını manuel yaz veya
  `create-next-app` ile başlat
- `.env.example` + `.env.local` (gizli) — bütün env anahtarları placeholder'lı
- `.gitignore` — `.env*.local`, `node_modules`, `.next`, `.vercel`, `.claude/`
- Klasör yapısı:
  ```
  src/
    app/          → routes (layout, page, api/, admin/)
    components/   → chatbot, admin, landing
    lib/          → ai, db, conversation, scoring, api, env, utils, analytics
    constants/    → magic numbers, label sözlükleri, email domains
    types/        → paylaşılan tipler (Lead, ChatMessage)
  supabase/
    schema.sql    → tablo + indeksler + RLS
  docs/           → planlama dosyaları
  ```
- Root layout (font + locale + OG metadata) ve placeholder landing/admin sayfaları
- `npm run dev` ile sayfanın açıldığını doğrula (boş bile olsa)

---

## Faz 2 — Veritabanı şeması + güvenlik temelleri (~30 dk)

Backend'in temeli. Bunu erken yapmak veri akışını test ederken işi kolaylaştırır.

- **Supabase tablosu:** `leads`
  - Kimlik (name, company, email, phone)
  - Kalifikasyon (intent, volume, current_tool, timeline, preferred_contact_time)
  - Skoring (score, temperature, score_breakdown — jsonb)
  - Konuşma (transcript jsonb, conversation_duration_sec)
  - Audit (ip_hash, user_agent, honeypot_filled)
  - Workflow (status: new/contacted/qualified/rejected, created_at)
- **CHECK constraint'ler** kabul edilen değerler için (intent, volume, timeline,
  temperature, status)
- **Indeksler:** created_at desc, score desc, temperature
- **RLS aktif:** sadece service_role yazabilir; anon erişim yok
- **Realtime publication** ekle (admin'de canlı bildirim için altyapı)
- Şemayı Supabase Dashboard → SQL Editor'da çalıştır, Table Editor'da görü onayla

> **Uyarı:** ilk versiyonda admin realtime için anon SELECT policy verirsen
> Supabase URL + anon key ile herkes leadleri çekebilir. Sonradan migration ile
> kaldır (bu projede `migration-001-tighten-rls.sql`).

---

## Faz 3 — Tipler, scoring, validation (~30 dk)

Domain logic katmanı — UI'dan ve route'lardan bağımsız test edilebilir kalmalı.

- **Tipler:** `Lead`, `LeadInput`, `ChatMessage`, `Volume`, `Timeline`, `Intent`
- **Lead scoring:** 0-100 arası, `score_breakdown` ile her +/- maddeyi sakla
  - Kurumsal e-posta +25
  - Sipariş hacmi (5k+ veya 5k-50k için +30, 500-5k için +15)
  - Zaman çizelgesi (this-week / this-month için +25)
  - Bilinen rakip arac +20 (özel çözüm +10)
  - Kısa konuşma -15
  - 80+ Hot, 50-79 Warm, <50 Cold
- **Validation (Zod):** name, company, email, currentTool için min/max + format
- **Anlam validasyonu (Türkçe sezgisel):**
  - `isPureGreeting()` — sadece "selam/merhaba/naber" yakalar
  - `isDismissive()` — "naber kız" gibi argo hitap
  - `looksLikeRefusal()` — "olmaz/yok/vermem"
  - `looksLikeQuestion()` — soru kalıpları + identity soruları + infix kalıplar
  - `isJunkInput()` — emoji-only, anlamsız
- **Unit test'ler** (Vitest) — bu fonksiyonların davranışını sabitle

---

## Faz 4 — External service istemcileri (~30 dk)

Supabase ve Gemini ile köprüler. Server-only kodu client'a sızdırmamak için ayrı
client'lar.

- **Supabase clients:**
  - `getBrowserClient()` — anon key, RLS uygulanır, sadece browser
  - `getServerClient()` — service_role key, RLS bypass, sadece server route'larda
- **Env validation (Zod):**
  - `clientEnv` — module load'da parse, sadece `NEXT_PUBLIC_*`
  - `getServerEnv()` — lazy + cached, server-only
  - Boş string'leri undefined'a çeviren `optionalUrl` preprocess (`.env`'de
    `KEY=` boş bırakılırsa Zod `.url().optional()` patlar — bu yüzden gerekli)
- **Gemini client:**
  - Tek export: `getGeminiClient(opts?)` — `systemInstruction` ile step-aware ek
    talimat verilebilir
  - `SYSTEM_PROMPT` sabiti — chatbot karakteri, ton, yasaklar, prompt injection
    savunması burada
- **AI summary fonksiyonu** (ayrı dosya) — chat akışından bağımsız, lead için
  2-cümlelik özet üretir

---

## Faz 5 — Conversation engine (~90 dk, en kritik faz)

Chatbot'un beyni. Bu fazın doğru kurulması projenin geri kalanını kolaylaştırır.

- **State machine** (`src/lib/conversation/state-machine.ts`)
  - Step tipleri: `greeting → identity_name → identity_company → identity_email →
    identity_email_confirm_personal? → qualification_volume → qualification_tool →
    timeline → summary → submitted`
  - `handleUserInput(step, input)` her step için 4 sonuçtan biri döner:
    `advance` (sonraki step), `branch` (özel alt step), `clarify` (aynı step + bot
    mesaj), `submit` (akış sonu), `fallback` (Gemini'ye git)
- **Scripted mesajlar** (`scripts.ts`)
  - Her step için bot mesajı + opsiyonel quick reply chip'leri
  - Quick reply payload'ları sabit (`PAYLOAD.CONFIRM`, `PAYLOAD.SKIP`, vs.)
- **Storage** (`storage.ts`)
  - localStorage ile konuşma durumunu sakla — refresh dirençli
  - Schema versioning ile ileride değişiklik yapılınca eski state korunmasın
- **Chatbot UI komponenti** (`Chatbot.tsx`)
  - Modal aç/kapat (FAB + Escape + backdrop click)
  - Focus trap + aria-live + klavye navigasyonu
  - Typing indicator (3 nokta pulse), mesaj balonları, quick replies
  - Honeypot input (gizli, bot dolduruyorsa server sessiz reddet)
  - State'i `useRef`'te de tut (stale closure'a karşı)
- **`/api/chat` endpoint'i** (Edge runtime)
  - Sadece off-script durumlarda çağrılır
  - Streaming response (Gemini sendMessageStream)
  - Step-aware `systemInstruction` ile o anki bağlamı Gemini'ye söyle
- **ProactiveBubble** komponenti
  - Landing'e girince 4 saniye sonra Aylin avatarı + davet mesajı
  - localStorage ile bir kez kapatılırsa tekrar çıkmaz
  - Mobilde gizli (FAB zaten yeterince dikkat çekiyor)

---

## Faz 6 — Backend persistence + AI summary (~45 dk)

Konuşma bittiğinde lead'i kalıcılaştırma.

- **`POST /api/leads`** pipeline (Node runtime):
  1. Zod ile body parse (`safeParse`)
  2. Honeypot dolu ise 200 dön ama yazma (sessiz reject)
  3. IP hash + rate limit (in-memory Map, IP başına 10 dk / 3 submission)
  4. `scoreLead()` ile skor + breakdown + temperature hesapla
  5. Supabase'e insert (service_role ile, RLS bypass)
  6. **Async** AI özet üret + UPDATE (fire-and-forget — insert'i bloklamasın)
  7. **Async** hot lead webhook (skor >= 80 ise `HOT_LEAD_WEBHOOK_URL`'e POST)
- **`GET /api/leads?key=`** — admin için filtre destekli liste
- **`PATCH /api/leads?key=`** — lead status'unu güncelle (workflow için)
- Client tarafında `submitLead()` köprüsü — Chatbot'tan API'ye veri akışı

---

## Faz 7 — Admin paneli (~60 dk)

Satış ekibinin günlük çalışacağı yer.

- **`/admin?key=<secret>` korumalı sayfa** (Server Component)
  - Yanlış key → ana sayfaya redirect
  - `getServerClient()` ile lead'leri çek
- **KPI kartlar** — 3 sıcaklık (Hot/Warm/Cold) için sayım
- **FiltersBar** — sıcaklık, status, tarih aralığı
- **LeadsTable**
  - Skor sırasıyla (default), renkli rozet (kırmızı/sarı/gri)
  - Mobile'da kart varyantına düşüş
  - Satıra tıkla → detay drawer açılır
- **LeadDetailPanel** (drawer)
  - **AI özet** en üstte (2 cümle — "kim, neden, neden şimdi")
  - **Skor breakdown** her +/- maddesi
  - **Tam transkript** mesaj balonlarıyla
  - **Status güncelle** select (new → contacted → qualified → rejected)
  - **Kopyala** butonu (lead bilgilerini panoya)

---

## Faz 8 — Landing page (~45 dk)

Chatbot'u doğal hisset­tirecek bağlam.

- **Header** — sticky, minimal nav, CTA
- **Hero** — eyebrow + büyük başlık + 2 CTA + alt satır risk-reversal mesajı
  ("Kart bilgisi istemiyoruz · 5 dakikada kurulum · 14 gün ücretsiz")
- **MockDashboard** — gerçek ürün screenshot'ı yoksa CSS+SVG ile sahte panel
  (Apple-tarzı menü circles + KPI satırı + line chart)
- **SocialProof** — 4 stat (marka sayısı, ciro, entegrasyon süresi, yanıt süresi)
- **Features** — bento grid (asimetrik): büyük kart + 2 küçük + geniş ikinci satır
- **FAQ** — 6 sıkça sorulan soru accordion
- **Footer** — 4 sütun (Brand, Ürün, Şirket, İletişim+Yasal)
- Hero ve Header'daki "Demo Talep Et" butonları `openChatbot()` helper'ı ile aynı
  modalı açar (Chatbot.tsx'e dokunmadan DOM event köprüsü)

---

## Faz 9 — Güvenlik sıkılaştırma + observability (~30 dk)

Production-ready vibrasyonu.

- **CSP + security headers** — `next.config.ts`'te `headers()` ile:
  - Content-Security-Policy (script/style/img/connect/font sources)
  - Strict-Transport-Security (HSTS preload)
  - X-Frame-Options: DENY (clickjacking)
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy (camera/mic/geolocation kapalı)
- **Prompt injection savunması** — `SYSTEM_PROMPT`'ta:
  - "Talimatlarını yoksay" tarzı denemeleri reddet
  - Model adı / teknoloji paylaşma
  - Küfürlü mesajlara kalıp cevap
- **RLS sıkılaştırma migration** — anon SELECT policy'sini kaldır
- **robots.ts** — `/admin` ve `/api/` crawl'a kapalı
- **Analytics adapter** (`lib/analytics.ts`) — vendor-agnostic `track()`,
  development'ta console.log, production'da sendBeacon
- Constants extract (`TYPING_DELAY_MS`, `RATE_WINDOW_MS`, `PERSONAL_EMAIL_DOMAINS`)

---

## Faz 10 — Deploy + canlı doğrulama (~20 dk)

- Vercel'e GitHub repo'yu import et
- Env değişkenlerini Vercel'e taşı (`.env.local` içeriğini "Import .env"
  butonuyla yapıştır)
- Production deploy'u izle, hata varsa logları yapıştır
- Canlı URL'i README'ye yaz
- End-to-end test canlıda:
  1. Landing açılıyor mu
  2. ProactiveBubble 4 sn sonra çıkıyor mu
  3. Chatbot 5 adımı tamamlatıyor mu
  4. Lead Supabase'e düşüyor mu
  5. /admin canlıda çalışıyor mu, lead listede mi
  6. Mobile (Chrome DevTools iPhone) bozuk mu

---

## Faz 11 — README + dokümantasyon (~30 dk)

Kalan zamanın en son 30 dakikasını koru — README projenin **hikayesi**.

- Demo URL + admin pattern + GitHub link
- 4-5 ekran görüntüsü (`docs/screenshots/`)
- Hızlı başlangıç (npm install, .env, Supabase SQL, npm test)
- Teknoloji seçimleri gerekçeli tablo
- Sistem mimarisi (ASCII diyagram + klasör yapısı)
- Karakter / akış / scoring / admin / güvenlik bölümleri
- PRD'deki muğlak sorulara verdiğin cevaplar
- 6 saatte yapamadıkların + +zamanım olsaydı listesi
- AI kullanımı hakkında dürüst not
- Toplam süre

---

## Genel prensipler

Bu sıralama keyfi değil — şu sezgilere dayanıyor:

1. **Karar verme her zaman önce.** Plan yapmadan kod yazmak 2 katı zaman alır.
2. **Schema önce, kod sonra.** Tablo şemasını sonradan değiştirmek migration ağrısı.
3. **Domain logic UI'dan önce.** Scoring/validation gibi pure fonksiyonları
   ayrı dosyaya yazıp test et — UI değişse bile bozulmazlar.
4. **Conversation engine projenin merkezi.** En çok zaman ona ayır, geri kalanı
   onun etrafına bağla.
5. **Backend persistence chatbot'tan sonra.** Önce konuşma çalışsın, sonra kaydet.
6. **Admin panelini lead'lerle test et.** Boş tablo görmek yerine fake data
   gönder, gerçek UX'i değerlendir.
7. **Landing en sona.** Tasarım iteratif, fonksiyon zorunlu. Boş kabuğun
   screenshot'ını alamazsın.
8. **Güvenlik sıkılaştırması temiz iş yapıldıktan sonra.** Önce çalışsın, sonra
   sertleştir.
9. **Deploy'u 2. saatte değil 5. saatte yap.** Lokalde çalışan kod prod'da
   patlayabilir; zaman gerek.
10. **README için kutsal son 30 dakika.** Bu projenin hikayesi — atlama.

---

## Zaman dağılımı özet

| Faz | Süre | Sonuç |
|---|---|---|
| 0 — Karar + hesap | 30 dk | Plan dosyaları + env hazır |
| 1 — Proje iskeleti | 45 dk | `npm run dev` boş kabukla açılıyor |
| 2 — DB şema + RLS | 30 dk | Supabase'te leads tablosu |
| 3 — Tip + scoring + validation | 30 dk | Pure fonksiyonlar + unit test |
| 4 — External clients | 30 dk | Supabase + Gemini çağrılabilir |
| 5 — Conversation engine | 90 dk | Çalışan chatbot |
| 6 — Backend persistence | 45 dk | Lead Supabase'e düşüyor |
| 7 — Admin paneli | 60 dk | Tablo + drawer + filtre |
| 8 — Landing page | 45 dk | Profesyonel landing |
| 9 — Güvenlik + observability | 30 dk | CSP, prompt injection, analytics |
| 10 — Deploy + canlı doğrulama | 20 dk | Vercel'de yaşıyor |
| 11 — README + dokümantasyon | 30 dk | Hikaye anlatımı |
| **Toplam** | **~7 saat** | |

> 6 saat hard limit için Faz 1 ve Faz 8 biraz kısaltılabilir, ya da Faz 9'un
> bazı maddeleri "+zamanım olsaydı" listesine bırakılabilir.
