# Session Handoff — Sonraki Session İçin

**Önceki session durum tespiti:** Hibrit mimari (ADR-001 + ADR-007) zaten kurulu, 4 servis dosyası untracked olarak duruyor, 86 test geçiyor, typecheck temiz.

Bu dosya **diğer session'ın açıp doğrudan eyleme geçmesi için** yazıldı.

---

## TL;DR — Mevcut Durum

Bu repo şu an iki session arasında bir "geçiş anı"nda:

- **Mimari:** state machine + LLM slot extraction hibridi (ADR-001, ADR-007) — Rumeysa'nın saf tool-calling yaklaşımına karşı bilinçli + dokümante tercih
- **Servisler:** `lib/services/{leads,rate-limit}.ts` çıkarılmış (ADR-008), route'lar 360 → 200 satır
- **Prompt:** `prompts/chatbot-system.md` externalize, webpack `asset/source` rule kurulu
- **Rate limit:** Upstash adapter + in-memory fallback, env-driven seçim (ADR-003)
- **Test:** 86 test geçiyor (`vitest run`)
- **Build:** `npm run typecheck` ✅. `npm run build` lokal'de `.next/trace` EPERM (dev server kilidi); Vercel'de çalışmalı

Önceki session'ın `Claude/aşama-1` analizinde önerdiği P0 (state machine → tool-calling), **ADR-001/007 ile gerekçeli olarak reddedildi** — bu doğru karar. Pure tool-calling 6h'de production'a alınamaz (eval suite + observability + retry yokluğu).

---

## Untracked WIP — Atomik Commit'lere Bölünmeyi Bekliyor

`git status --short` çıktısına göre bölüm önerisi:

### Commit 1 — `feat(prompts): externalize system prompt + .md asset loader`
```
M  next.config.ts                       (.md webpack rule + CSP cleanup)
A  prompts/chatbot-system.md            (Aylin personasi + persona/guardrail)
A  src/types/markdown.d.ts              (.md module declaration)
M  src/lib/ai/gemini.ts                 (import from .md)
M  src/lib/env.ts                       (GEMINI_MODEL default 2.5-flash)
```
**ADR referansı:** yok (mekanik refactor)

### Commit 2 — `feat(services): extract leads + rate-limit service layer`
```
A  src/lib/services/leads.ts            (createLead, listLeads, updateLeadStatus)
A  src/lib/services/rate-limit.ts       (adapter pattern: Upstash + in-memory)
A  src/lib/services/rate-limit.test.ts  (4 test)
M  src/app/api/leads/route.ts           (thin HTTP wrapper)
```
**ADR referansı:** ADR-003, ADR-008

### Commit 3 — `feat(chatbot): slot extraction tool loop (hybrid LLM-driven)`
```
A  src/lib/ai/extract-slots.ts          (Gemini structured output)
A  src/app/api/slots/route.ts           (POST endpoint)
M  src/components/chatbot/Chatbot.tsx   (parallel /api/chat + /api/slots)
M  src/lib/conversation/state-machine.ts (findNextEmptyStep + auto-advance)
M  src/lib/conversation/state-machine.test.ts
```
**ADR referansı:** ADR-007

### Commit 4 — `feat(admin): shadcn ui primitives + lead detail polish`
```
A  components.json                      (shadcn config)
A  src/components/ui/                   (Dialog, etc.)
M  src/components/admin/LeadDetailPanel.tsx
M  src/components/admin/LeadsTable.tsx
M  src/components/admin/AdminDashboard.tsx
M  src/components/chatbot/ChatHeader.tsx
M  tailwind.config.ts
M  src/app/globals.css
M  package.json                          (@radix-ui/* + class-variance-authority + tailwindcss-animate)
```
**Not:** Bunu commit etmeden önce `LeadDetailPanel`'a baktığını teyit et — uncommitted bir UI değişikliği büyük olabilir.

### Commit 5 — `feat(leads): CSV export endpoint`
```
A  src/app/api/leads/export/            (CSV stream)
```

### Commit 6 — `docs: add ADR log + performance + handoff notes`
```
A  docs/decisions.md                    (ADR-001 to ADR-008)
A  docs/08-performans-notlari.md
A  HANDOFF.md (this file)
M  README.md                            (zaten WIP)
```

### Commit 7 — `test: vitest setup file + config tweaks`
```
A  vitest.setup.ts
M  vitest.config.ts
```

---

## Gerçekten Kalan İş (Önceliklendirilmiş)

### P0 — Manuel duman testi (10 dk)
Slot extraction Gemini call'unu canlıda dene. Senaryo:
```
Kullanici: "Merhaba ben Ahmet, Acme'den, demo gormek istiyorum"
Beklenen: bot 3 step birden atlayip volume soruyor
```
Network tab'da `/api/slots` 200 + `slots: {name: "Ahmet", company: "Acme", intent: "demo"}` dönmeli.

**Eğer fail:** `GEMINI_API_KEY` quota dolmuş olabilir (free tier 20 req/day). Billing upgrade veya gun degisimini bekle.

### P1 — Vercel Analytics + Sentry (45 dk)
`docs/08-performans-notlari.md` 4. ve 5. madde — copy-paste hazır.

CSP'ye `https://*.ingest.sentry.io` ekle (Sentry init'inden sonra).

### P2 — Production duman testi
1. Vercel'e push, deploy bekle
2. Honeypot, rate limit (4 submission'da 429 görmeli), disposable email reject senaryolarını dene
3. Admin'de yeni lead'i scoring breakdown ile gör
4. Hot lead (skor >= 80) için `HOT_LEAD_WEBHOOK_URL` ayarlıysa webhook payload'unu doğrula

### P3 — CLAUDE.md güncelle (15 dk)
Bu dosya hâlâ "klasor yapisi" altında eski yapıyı gösteriyor:
- `lib/services/` ekle
- `prompts/` ekle
- `lib/ai/extract-slots.ts` ekle
- ADR referansı ekle (`docs/decisions.md`)

### P4 — README ekran görüntüleri kontrolü
`docs/screenshots/05-mobile.png` README'de referansı varsa, dosya henüz yok (sadece 01-04 var). Ya çek ya referansı kaldır.

---

## Önceki Session'ın Kıyaslama Analizinde Geri Çekilenler

Bir önceki cevaplarımda Rumeysa ile kıyaslarken **state machine'i sökmeni** önermiştim. Bu **yanlıştı**, çünkü `docs/decisions.md`'i okumamıştım. Doğrusu:

| Önceki tavsiye | Revize edilmiş tavsiye | Sebep |
|---|---|---|
| "State machine'i çöpe at, function-calling'e geç" | **Yapma.** ADR-001 ve ADR-007 hibridi gerekçeli | Hibrit deterministik + esnek; pure LLM 6h'de eval suite olmadan kırılgan |
| "`looksLikeQuestion()` regex çorbası = brittle tasarım semptomu" | **Doğru kalsın.** ADR-005 LLM-bağımsız validation gerekçeli | 1ms latency, 33 test, "Ayşe"/"Müğla" kalibrasyonu — silmek ROI'siz |
| "Kod miktarı çok abartılı (6128 LOC)" | **Yumuşatılmış.** ADR-008 service extraction zaten yapıldı | Route 360 → 200 satır olunca ek refactor düşük öncelik |

**Hâlâ geçerli olan:**
- ✅ Upstash Redis rate-limit (yapıldı — ADR-003)
- ✅ Prompt externalize (yapıldı)
- ✅ Gemini 2.5 Flash (yapıldı)
- ✅ Services layer (yapıldı — ADR-008)
- ✅ Sentry + Analytics (HENÜZ yapılmadı — P1)

**Yeni tespit (önceki analizde yoktu):**
- ✅ Hibrit slot extraction (ADR-007) — Rumeysa'da yok, sende var. Bu **senin Rumeysa'dan açık ara öne çıktığın** bir özellik. Pure tool-calling vs hibrit tartışmasında ADR-001 ile **savunma değil hücum** pozisyonundasın.

---

## Rumeysa vs Sen — Revize Edilmiş Skor

| Boyut | Rumeysa | Sen (revize) |
|---|---|---|
| Mimari karar | Pure tool-calling (cesur ama eval suite yok) | Hibrit + ADR'lerle gerekçeli (savunulabilir + dokümante) |
| Test | 0 | 86 test |
| Observability | Yok (eval, log, Sentry — hiçbiri) | Hâlâ eksik (P1) — adil eşit |
| Production UX | Eksik (error.tsx yok, RLS yok, CSP yok) | Tam |
| Doküman | README + 1 CLAUDE.md | README + 8 ADR + 8 doc + ekran görüntüleri |
| Servis katmanı | `lib/services/` var (chat, lead-score, leads, pre-filter, rate-limit) | `lib/services/` var (leads, rate-limit) — eşit |
| Slot extraction | Tool-calling içinde implicit | Explicit hibrit (test edilebilir, fail-safe) |
| Git hijyeni | 3 commit (dump pattern) | 11 commit + bu commit'lerden önce 7 atomik commit eklenmeyi bekliyor — toplam 18 |

**Önceki tespit:** "Rumeysa = senior mimari, junior bitiriş. Sen = junior mimari, senior bitiriş."

**Revize:** "Rumeysa = cesur mimari ama eval suite yok, junior bitiriş. Sen = ADR-yönetimli orta-mimari + senior bitiriş + observability borcu."

Eksik kalan tek alan: **gözlemlenebilirlik** (Sentry + LangFuse + analytics). P1'de kapanır.

---

## Sonraki Session İçin İlk 3 Adım

1. **Bu HANDOFF.md'yi okuyun.**
2. `npm test && npm run typecheck` ile durumu doğrulayın (86 test + temiz typecheck bekliyor).
3. P0 manuel duman testini yapın. Geçerse → atomik commit'leri pushlayın (yukarıdaki Commit 1-7 sırası). Geçmezse → Gemini quota / API key kontrol edin.

İyi şanslar.
