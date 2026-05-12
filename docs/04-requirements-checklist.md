# Requirements Checklist — Ürün gereksinim ↔ teslimat eşleştirmesi

> Ürün gereksinim setindeki her madde → kod karşılığı.
> Skopu görmezden geldiğimiz nokta olmasın diye.

---

## A. Zorunlu — "in scope" maddeler

| # | Gereksinim | Çözüm | Dosya/Bileşen | Durum |
|---|---|---|---|---|
| A1 | Landing page'de tetiklenen chatbot arayüzü | `Chatbot.tsx` komponenti (state machine + Gemini fallback), Hero CTA `openChatbot()` ile açılır | `src/components/chatbot/`, `src/components/landing/`, `src/app/page.tsx` | ✅ |
| A2 | Oluşan iletişim taleplerinin saklanması | Supabase `leads` tablosu, `POST /api/leads` (Zod + scoring + AI özet + spam savunması) | `supabase/schema.sql`, `src/app/api/leads/route.ts` | ✅ |
| A3 | Ekibin talepleri listeleyebildiği basit iç görünüm | `/admin?key=...` sayfası: KPI + filtre + tablo + detay drawer + status PATCH | `src/app/admin/page.tsx`, `src/components/admin/` | ✅ |
| A4 | Mobil uyumlu | Tailwind responsive: chatbot bottom-sheet, admin tablonun kart varyantı, hero grid yenidendüzeni | tüm `src/components/` | ✅ |
| A5 | Çalışan, deploy edilmiş link | Vercel deploy (env'leri Vercel'e taşı + import) | Vercel | ⏳ deploy bekliyor |
| A6 | README (lokalde çalıştırma, teknoloji seçimi, kısıtlar, muğlak yerlerin yorumu) | `README.md`, "Yapıldı/Yapılamadı" + tech rationale tablosu + product decisions | `README.md` | ✅ |

---

## B. SCOPE DISI — Yapmiyoruz (Briefte acikca yazili)

| # | Yapmiyoruz | Niye? |
|---|---|---|
| B1 | Auth / kullanici hesap sistemi | Brief: out of scope. Admin'e basit query-param key ile erisim. |
| B2 | E-posta / SMS entegrasyonu | Brief: "talebi sisteme dusurmek yeter". Sadece DB'ye yaziyoruz. |
| B3 | Mobil app | Brief: out of scope. Sadece web (mobil-responsive). |
| B4 | Coklu dil destegi | Brief: out of scope. Sadece TR. |

---

## C. PRD'de MUGLAK Birakilan Sorular (Bizim Cevaplarimiz)

> Bu sorulara verdigimiz cevaplar README'de detaylanacak.

### C1. Chatbot ne soracak, hangi sirayla, ne zaman "yeter" diyecek?
**Cevap:** 5 adimli akis: selamlama -> kimlik -> kalifikasyon -> aciliyet -> ozet.
"Yeter" noktasi: 3. adim (kalifikasyon) tamamlandiginda lead gecerli sayilir.
**Detay:** `docs/02-conversation-flow.md`

### C2. Chatbot'un tonu ve kisiligi?
**Cevap:** "Aylin" — profesyonel-sicak, "siz" hitabi, sade emoji, dogrudan fiyat vermez.
**Detay:** `docs/02-conversation-flow.md` (Aylin'in Karakteri)

### C3. Satis ekibi iyi lead'i kotuden nasil ayirt edecek?
**Cevap:** 0-100 skor sistemi. Kurumsal email, yuksek hacim, yakin zaman, rakip arac kullanimi puan kazandirir. Kisa konusma cezalandirilir.
Skor breakdown'i her lead'in detayinda gosterilir.
**Detay:** `src/lib/scoring/score.ts`, `docs/02-conversation-flow.md`

### C4. Admin view'de hangi bilgiyi nasil gosterelim?
**Cevap:**
- Tablo: skor + kimlik + niyet + zaman cizelgesi + status + tarih
- Detay: AI ozeti (2 cumle) + skor breakdown + tam transkript + status guncelleme
- Filtre: status, temperature, tarih
- Realtime: yeni lead anlik dusuyor
**Detay:** `docs/01-design-system.md`, `docs/03-roadmap.md` Faz 3

### C5. Kotu niyetli kullanim icin ne yaparsin?
**Cevap (Cok katmanli):**
1. Honeypot field (gizli input, bot doldurursa rejected)
2. Rate limit (IP basina 10dk/3 submission)
3. Minimum konusma suresi (<30sn = skor cezasi + flag)
4. Email format kontrolu + disposable domain blacklist
5. Server-side Zod validasyonu (client'a guvenmem)
6. Gemini ile kufurlu/spam mesaj tespiti
**Detay:** `docs/03-roadmap.md` Faz 5

### C6. Ziyaretci bir sorunun cevabini vermek istemezse?
**Cevap (Esnek):**
- Kimlik bilgileri (isim+email): Bir kez nazikce yeniden iste, hala reddederse "hazir oldugunuzda yazin" diyerek konusmayi kapat. Kismi lead kaydetme.
- Diger bilgiler: Atlat, ama notla. Satis ekibi "kullanici X'i atlamis" gorur. Skor ufak ceza.
**Detay:** `docs/02-conversation-flow.md` (Ozel Senaryolar)

---

## D. EKSTRA — Brief'te Yok ama Yapinca Etkili

> Bu maddeler vizyon ve mukemmellik puanlari.

| # | Madde | Etki |
|---|---|---|
| D1 | AI-uretilmis lead ozeti (sales 30sn'de anlar) | Satis ekibinin gercek kazanci |
| D2 | Realtime admin (yeni lead anlik) | "Bu cocuk farkli" hissi |
| D3 | localStorage ile konusma direnci | Refresh atinca veri kaybolmaz, UX |
| D4 | A11y (klavye, screen reader, focus) | B2B'de prim yapar |
| D5 | Honeypot + rate limit + disposable check | Brief'te "guvenlik" sorusunun cok katmanli cevabi |
| D6 | Skor breakdown'i (her +/-) | Sales "bu lead neden hot?" sorusunu cevaplar |
| D7 | Hot lead webhook (opsiyonel) | Ekibin gercek dunyada gercekten kullanacagi |
| D8 | Edge runtime + streaming | Modern Next.js, hizli first byte |
| D9 | Type-safe end-to-end (Zod sema) | Mühendislik kalite sinyali |
| D10 | docs/ klasoru (bu dosyalar) | "Bu cocuk dokumante ediyor" - mukemmel |

---

## E. README'de OLMASI ZORUNLU Bolumler (Brief'ten)

- [ ] Nasil calistirilir (lokalde) — komutlar adim-adim
- [ ] Hangi teknolojileri sectim ve neden — gerekceli tablo
- [ ] 6 saatte neyi yapamadim — durust liste
- [ ] Daha fazla zamanda ne eklerdim — vizyon listesi
- [ ] PRD'de muglak biraktiklarini nasil yorumladim — bu dosyadaki C bolumu basligi

---

## F. Teslim Listesi (Son Kontrol)

- [ ] GitHub repo public veya degerlendiriciyi davet et
- [ ] Repo'da `.env.local` YOK (sadece `.env.example`) — `.gitignore` koruyor
- [x] README.md eksiksiz (Yapildi/Yapilamadi, tech rationale, product decisions hepsi var)
- [ ] Vercel canli URL README'de
- [x] Demo akisi end-to-end calisiyor (POST /api/leads -> Supabase -> /admin'de tabloya dusuyor, AI ozet async geliyor)
- [ ] Admin URL + secret key teslim notunda (README'ye gizli key konmadi, secret degerlendirici icin ayri iletilecek)
- [x] Mobile gorunum bozuk degil (chatbot bottom-sheet, admin kart, landing responsive hero/bento)
- [x] Commit history mantikli (feat/fix/chore prefixleri)
- [x] Toplam sure README'de aciklandi
