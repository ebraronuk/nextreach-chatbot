# Architectural Decision Records (ADR)

Bu doküman, NextReach Chatbot projesinde verdiğim mimari kararları kayıt altına alıyor. Her ADR, "neden bu yolu seçtim, hangi alternatifleri değerlendirdim, sonuçları ne" sorularına cevap veriyor.

Format her birinde aynı:
- **Bağlam** — kararı veren problem / kısıt
- **Seçenekler** — değerlendirdiğim alternatifler
- **Tercih** — seçtiğim yol ve gerekçesi
- **Sonuçlar** — hangi kapıyı açtı, hangi kapıyı kapattı

---

## ADR-001: Scripted state machine + LLM fallback (LLM-driven yerine hibrit)

- **Tarih:** 2026-05-11
- **Durum:** Kabul edildi

**Bağlam.** Chatbot kullanıcıdan yapılandırılmış lead bilgisi (isim, şirket, email, hacim, timeline) toplamalı; aynı zamanda off-script sorulara da cevap verebilmeli ve production'a deploy edilebilir olmalı.

**Seçenekler.**
1. **Pure LLM-driven (tool calling).** Gemini'ye `submit_lead`, `validate_email` gibi tool'lar verip konuşmanın tamamını ona bırakmak. Modern, "2025 tarzı".
2. **Pure scripted.** Sabit sırada sorular soran klasik form-vari bot.
3. **Hibrit: scripted state machine + LLM fallback.** Akışı state machine yönetir; kullanıcı off-script gittiğinde LLM devreye girer.

**Tercih.** Seçenek 3 (hibrit).

Pure LLM-driven (1) doğru çalıştığında çekici ama production'a koymak için **eval suite (30+ senaryoluk LLM-as-judge testi), guardrail katmanı, observability altyapısı (LangFuse), retry/timeout politikası ve fallback davranış** gerektirir; bu MVP skopunun ötesinde. Pure scripted (2) sıkıcı ve günümüz B2B alıcı beklentilerinin altında.

**Sonuçlar.**
- ✅ Her lead'in temiz veriyle kaydedildiği garantili (state machine + Zod boundary)
- ✅ Konuşma başına ortalama 1-2 LLM çağrısı (cost 4-5× daha düşük)
- ✅ Gemini API down olsa bile sistem çalışmaya devam eder
- ❌ "Tek mesajda her şey söyleyen" kullanıcılar için doğal değildi — bu eksikliği `ADR-007` ile (tool loop) kapattım
- ✅ ADR-007'ye doğal evrim yolu açık

---

## ADR-002: Lead skor breakdown'ını JSONB kolonunda saklamak

- **Tarih:** 2026-05-11
- **Durum:** Kabul edildi

**Bağlam.** Lead'ler 0-100 arası skorlanıyor. Satış ekibi admin panelinde bir lead'i görünce "Bu lead neden 85 aldı?" sorusunu sormalı. Tek bir `score` integer kolonu bu soruyu cevaplamıyor.

**Seçenekler.**
1. **Sadece `score` integer kolonu.** Minimal, basit.
2. **Her faktör için ayrı kolon** (`email_score`, `volume_score`, ...). Tip-güvenli ama schema değişimi her yeni faktörde migration.
3. **`score_breakdown jsonb` kolonu**: `[{reason: "Kurumsal e-posta", delta: 25}, ...]`. Schema-less, esnek.

**Tercih.** Seçenek 3 (JSONB).

Yeni bir scoring faktörü eklemek migration gerektirmez. Frontend `score_breakdown` array'ini direkt liste olarak gösterir. Satış ekibi bir lead'in detay drawer'ında **"Neden bu skor?"** maddelerini görür.

**Sonuçlar.**
- ✅ Scoring algoritmasını değiştirmek serbest (compile zamanı break yok)
- ✅ Admin paneli rich detail veriyor: kullanıcı `+25 Kurumsal e-posta, +30 Hacim 5k+, -15 Kısa konuşma` görüyor
- ❌ Aggregate sorgular (örnek: "kaç lead için kurumsal email +25 aldı?") JSONB üzerinde daha yavaş — şu an gerek yok
- ✅ Postgres `jsonb_array_elements` ile analytics yazılabilir gerektiğinde

---

## ADR-003: In-memory rate limit + Upstash adapter pattern

- **Tarih:** 2026-05-12
- **Durum:** Kabul edildi

**Bağlam.** `/api/leads` endpoint'i için IP başına rate limit (10 dk pencerede 3 submission) gerek. Vercel serverless modelinde her instance ayrı ayağa kalkar.

**Seçenekler.**
1. **Pure in-memory `Map`.** Tek instance'da çalışır; Vercel'in multi-instance modelinde her instance ayrı sayar — kullanıcı 3 değil 9 submission yapabilir.
2. **Pure Upstash Redis.** Production'da doğru ama hesap açma + env yönetimi + dev'de internet bağımlılığı.
3. **Adapter pattern + auto-select.** Env varsa Upstash, yoksa in-memory.

**Tercih.** Seçenek 3.

`lib/services/rate-limit.ts` içinde adapter interface tanımlandı; `createInMemoryAdapter()` ve `createUpstashAdapter()` ayrı implementasyonlar. Module-level `getAdapter()` env'e bakıp birini seçiyor. Yeni paket bağımlılığı yok — Upstash REST API'sini raw `fetch` ile çağırıyoruz.

**Sonuçlar.**
- ✅ Dev'de internet bağımlılığı yok (in-memory)
- ✅ Production'da `UPSTASH_REDIS_REST_URL` + `_TOKEN` set edildiği an Upstash devreye giriyor — kod değişikliği yok
- ✅ Yeni paket bağımlılığı yok (sadece `fetch`)
- ❌ Sliding-window yerine fixed-window kullandık (edge bursting riski teorik var; 3/10dk'da kabul edilebilir)
- ✅ Test edilebilir — in-memory adapter testlerle korunuyor

---

## ADR-004: Admin paneline query-param secret (gerçek auth yerine)

- **Tarih:** 2026-05-11
- **Durum:** Kabul edildi (production'a almadan önce yenilenmeli)

**Bağlam.** Admin sayfası satış ekibine lead'leri gösteriyor. Brief auth'u kapsam dışı bırakmıştı ama yine de erişim kontrolü gerek.

**Seçenekler.**
1. **NextAuth.js + magic link.** Production-grade, ama kurulum + email provider + UI.
2. **Supabase Auth.** Doğru entegrasyon ama yine kurulum + email confirmation flow.
3. **`?key=<ADMIN_SECRET_KEY>` query param.** Server-side karşılaştır, yanlışsa redirect.

**Tercih.** Seçenek 3.

MVP skopunda "auth kapsam dışı" yorumlandığında en hafif koruma yöntemi. Server Component'te `searchParams.key !== expected → redirect("/")`. URL paylaşma riski var ama bu skop için kabul edilebilir.

**Sonuçlar.**
- ✅ Kurulum 0 dakika, hemen koruma var
- ❌ URL referer leak riski (production'da uygunsuz)
- ❌ Browser history'de görünür
- ✅ Production'a aldığım gün `middleware.ts` + NextAuth ile değiştirilebilir — admin sayfasının `key` parametresi tarihçesinde
- ✅ `/admin` URL'i robots.txt ile disallow edildi (indekslenme önlemi)

---

## ADR-005: Türkçe-spesifik validation katmanı (LLM'e bırakmak yerine)

- **Tarih:** 2026-05-12
- **Durum:** Kabul edildi

**Bağlam.** Kullanıcı isim sorusuna "naber kız" yazarsa isim olarak kaydedilmemeli. Email sorusuna "vermem" derse zorla email isteyemem. "hgdsghsdghdsü" gibi tuş kombinasyonları lead'i değersiz yapar.

**Seçenekler.**
1. **Her validation'ı LLM'e sor.** "Bu isim makul mü?" → Gemini cevaplar. Her tur ekstra LLM çağrısı.
2. **Sadece Zod + format kontrolü.** `min(2)` yeterli, dilbilimsel anlamı görmezden gel.
3. **Çok katmanlı validation** — Zod format + Türkçe dilbilimsel pattern'ler + fonotik gibberish + klavye satırı analizi.

**Tercih.** Seçenek 3.

`lib/conversation/validation.ts` içinde 4 katman: refusal (`isLooksLikeRefusal`), dismissive (`isDismissive`), kimlik soruları (`looksLikeQuestion` IDENTITY pattern), fonotik gibberish (`looksLikeGibberish` Türkçe sesli oranı + sessiz cluster + klavye satırı). Hepsi test edilebilir, LLM bağımsız.

**Sonuçlar.**
- ✅ Latency ~1ms (LLM çağrısı 200-500ms'in tersine)
- ✅ Cost sıfır (her validation için LLM call değil)
- ✅ Deterministik + test edilebilir — 33 unit test
- ✅ "Ayşe", "Müğla-Köyceğiz", "Çelik" gibi gerçek Türkçe isimler false-positive vermez (kalibre edildi)
- ❌ LLM'in yakalayabileceği "anlam" katmanları yok (örnek: aynı kelimenin farklı bağlamda farklı anlamı)
- ✅ LLM hala devrede — kullanıcı soru sorarsa Gemini fallback'e gidiyor (ADR-001)

---

## ADR-006: localStorage ile session persistence (server-side session yerine)

- **Tarih:** 2026-05-12
- **Durum:** Kabul edildi

**Bağlam.** Kullanıcı sohbet ortasında sayfayı yenilerse kaybolmamalı. "Aylin'in nasıl yardımcı olabileceğini" baştan sormak kötü UX.

**Seçenekler.**
1. **Server-side session (Supabase / Redis).** Cookie-based session ID, server'da state. Production-grade ama anonim ziyaretçilere overkill.
2. **localStorage.** Browser-only, anonim, basit. Tüm conversation state JSON serialize edilir.
3. **URL state.** Konuşma state'ini URL hash'inde tutmak. Paylaşılabilir ama uzun URL.

**Tercih.** Seçenek 2.

`lib/conversation/storage.ts` içinde `loadConversation()` / `saveConversation()` / `clearConversation()` helper'ları. State değişiminde otomatik kaydet, 24h TTL kontrolü ile yükle. `SCHEMA_VERSION` constant'ı ile eski format temizlenebilir.

**Sonuçlar.**
- ✅ Server-side state hiç yok — basit, ucuz
- ✅ Anonim kullanıcı için kimlik gerekmez
- ✅ F5 / tab değiştir / 1 saat sonra dön → konuşma devam eder
- ❌ Cihazlar arası senkron yok (kullanıcı telefonunda başlayıp laptop'ta devam edemez)
- ❌ `SCHEMA_VERSION` artarsa migration yazılmadı — eski format silinip baştan başlatılır (kabul edilebilir trade-off)
- ✅ Bot otomatik atılan mesajlar lokal — server log'a düşmez (privacy plus)

---

## ADR-007: Off-script fallback'te slot extraction tool loop'u

- **Tarih:** 2026-05-12
- **Durum:** Kabul edildi

**Bağlam.** ADR-001 hibrit yaklaşımının doğal sınırı: kullanıcı tek mesajda "Merhaba ben Ahmet, Acme'den, demo görmek istiyorum" yazdığında bot hala "Adınız nedir?" diye soruyordu — verilen bilgiyi görmezden geliyordu.

**Seçenekler.**
1. **Hiçbir şey yapma.** Hibrit yaklaşımın sınırı kabul edilebilir; kullanıcı tekrar yazar.
2. **Her mesaja LLM çağırıp slot çıkarmak.** Pahalı, latency yüksek.
3. **Sadece off-script fallback turunda paralel slot extraction.** Kullanıcı zaten soru sorduğunda hem cevabı yaz hem slot'ları çıkar.

**Tercih.** Seçenek 3.

`POST /api/slots` endpoint'i, Gemini structured output ile `{name?, company?, email?, intent?, volume?, timeline?, currentTool?}` döner. `Chatbot.tsx`'in `playGeminiFallback` fonksiyonu `/api/chat` (streaming cevap) ve `/api/slots`'u paralel çağırır. Slot'lar `leadData`'ya merge edilir, `findNextEmptyStep(currentStep, leadData)` ile bot otomatik atlanması gereken step'leri geçer.

**Sonuçlar.**
- ✅ "Merhaba ben Ahmet, Acme'den" → bot 3 step birden atlayıp volume soruyor (UX büyük sıçrama)
- ✅ Her mesaja LLM koymamış olduk → cost kontrolü korundu (sadece off-script fallback turunda 1 ekstra call)
- ✅ Zod validation slot'ları sterilize ediyor; Gemini halüsinasyonu state'e sızmıyor
- ✅ Fail-safe: extract-slots fail olursa boş obje döner, sistem eski davranışa düşer
- ❌ Production gözetimi için LangFuse / Sentry kurulu değil — sahte slot'lar üretilirse fark edilmesi gecikebilir
- ✅ ADR-001'in "doğal evrim yolu" kısmında bahsettiğim ilk somut adım

---

## ADR-008: Service layer çıkarımı (lib/services/)

- **Tarih:** 2026-05-12
- **Durum:** Kabul edildi

**Bağlam.** Başlangıçta `app/api/leads/route.ts` 360 satıra ulaştı. İçinde: Zod validation, rate limit, honeypot check, disposable email, lead scoring, Supabase insert, AI summary trigger, hot webhook trigger. Test yazmak imkansız (her şey HTTP context'i içinde), refactor riskli.

**Seçenekler.**
1. **Olduğu gibi bırak.** Monolitik route'lar Next.js'te yaygın; küçük projeler için kabul edilebilir.
2. **Mantığı utility fonksiyonlara böl** (`lib/utils/insertLead.ts`, `lib/utils/rateLimitCheck.ts`). Fonksiyon dağınıklığı.
3. **Service layer** — `lib/services/{leads,rate-limit}.ts` ile business logic'i HTTP'den ayır.

**Tercih.** Seçenek 3.

`lib/services/leads.ts` içinde `createLead`, `listLeads`, `updateLeadStatus` fonksiyonları. `lib/services/rate-limit.ts` içinde adapter pattern (ADR-003). Route artık 200 satır — sadece HTTP gates (parse, response shape, status code). Mantık ayrı dosyalarda test edilebilir.

**Sonuçlar.**
- ✅ Route file 360 → 200 satır
- ✅ Service fonksiyonları HTTP-bağımsız, başka bir entry point'ten (cron, batch import, CLI) çağrılabilir
- ✅ Test yazımı kolay (HTTP mock'a gerek yok)
- ❌ İndirect refactor — ekstra dosya / mental overhead
- ✅ Cleaner code review surface — bir kişi route'a bakıp "ne yapıyor" sorusunu 30 saniyede cevaplar

---

## Not — bu doküman canlı

Yeni mimari kararlar verdikçe yeni ADR'ler eklenir. Eski ADR'ler "Üstüne yazıldı" durumuna geçirilir, kaldırılmaz — geçmiş kararın bağlamı saklanır.

Production'a alındığında bu listeye eklemem gereken adaylar:
- **ADR-009:** Sentry + LangFuse entegrasyonu
- **ADR-010:** Eval suite (LLM-as-judge) ile CI gating
- **ADR-011:** Voice layer — scripted akıştaki sabit cümleleri LLM'e yazdırmak
