# Chatbot Konusma Akisi — Aylin

> Aylin'in soracagi tum sorular, dallanmalar, validasyonlar.
> Bu dokuman kodlamadan once netlesirse implementasyon 3x hizlanir.

---

## 1. Aylin'in Karakteri (Sistem Prompt'una Yansiyacak)

- **Ad:** Aylin
- **Rol:** NextReach Satis Danismani
- **Ton:** Profesyonel-sicak, "siz" hitabi, kisa cumleler
- **Yasak:** Dogrudan fiyat verme, teknik derinlige inme, satis baskisi
- **Stil:** 1-2 emoji max, asla "Sn." gibi resmiyet

---

## 2. State Machine (Konusma Durumu)

```typescript
type Step =
  | "greeting"        // Acilis + niyet sorma
  | "identity"        // Isim, Sirket, Email
  | "qualification"   // Hacim, su anki cozumu
  | "timeline"        // Zaman cizelgesi (opsiyonel)
  | "summary"         // Ozet + onay
  | "submitted"       // Gonderildi
  | "abandoned";      // Ziyaretci vazgecti
```

Her step icin: bot ne soruyor, kullanici ne yanitlayabilir, neye gore dallaniyor.

---

## 3. Adim 1 — GREETING (Selamlama + Niyet)

### Bot acilis mesaji
```
Merhaba! 👋 Ben Aylin, NextReach satis danismaniyim.
Bugun size nasil yardimci olabilirim?
```

### Hizli cevap onerileri (chip buton)
- "Demo gormek istiyorum"  → intent=demo
- "Fiyatlandirma"           → intent=pricing
- "Entegrasyon sormak"      → intent=integration
- "Genel bilgi"             → intent=other

### Serbest metin de kabul edilir
Kullanici "Ben sadece arastiriyorum" yazarsa → Gemini intent=other olarak isaretler.

### Sonraki step
→ `identity`

---

## 4. Adim 2 — IDENTITY (Kimlik)

Bot bir-bir sorar (hepsini tek mesajda sormak agir gelir):

### 2a. Isim
```
Cok iyi! Once kisaca tanisalim. Adiniz nedir?
```
- **Validasyon:** Min 2 karakter, max 60
- **Reddederse:** "Anladim 🙏 Talebinizi kaydedebilmem icin sadece kisa bir tanitim yeterli, isminizi paylasir misiniz?"
- **2. red:** "Anladim, isim olmadan ekibimiz size donus yapamiyor maalesef. Hazir olursaniz yazabilirsiniz, ben buradayim."

### 2b. Sirket
```
Tanistigimiza sevindim, {name}. Hangi sirketten yaziyorsunuz?
```
- **Validasyon:** Min 2 karakter
- **Reddederse:** Atla (notla, skor -5)

### 2c. Is e-postasi
```
Ekibimizin size dogrudan donus yapabilmesi icin is e-postanizi alabilir miyim?
```
- **Validasyon:** Email format (Zod)
- **Kurumsal kontrolu:** gmail/hotmail/yahoo geliyorsa:
  ```
  Kisisel adresinizi gormus oldum. Mumkun ise sirket e-postaniz, takip kalitemiz icin daha iyi olur.
  Yine de bu adresle devam etmek ister misiniz?
  ```
- **Hala kisisel:** Kabul et, ama skoru dusur (-25 ekstra puan kaybi).

### Sonraki step
→ `qualification`

---

## 5. Adim 3 — QUALIFICATION (Kalifikasyon, "Yeter" noktasi)

### 3a. Aylik siparis hacmi
```
NextReach'i sizin icin daha iyi konumlandirabilmem icin: aylik yaklasik kac siparis isliyorsunuz?
```

**Chip butonlar:**
- "500'den az" → `<500`
- "500 - 5,000" → `500-5k`
- "5,000 - 50,000" → `5k-50k`
- "50,000+" → `50k+`
- "Henuz baslamadik" → not_started (skor -10)

### 3b. Su anki cozumu
```
Su an siparis ve analitik tarafinda hangi araclari kullaniyorsunuz?
```

- **Serbest metin** (ornek: "Excel + Shopify Analytics", "kendi panelimiz", "hicbir sey")
- **Gemini ile parse:** "rakip arac" sinyali (Shopify Analytics, Klaviyo, Mixpanel, Heap, kendi paneli) → +20 skor
- **"Hicbir sey":** Lead notuna eklenir, ama skor dusurmez

### CHECKPOINT — "Yeter" noktasi
**Buraya kadar gelen ziyaretci = gecerli lead.** 4. adim kaciragu bile lead kaydedilir.

### Sonraki step
→ `timeline`

---

## 6. Adim 4 — TIMELINE (Aciliyet, OPSIYONEL)

```
Son bir sorum: NextReach'i kullanmaya ne zaman baslamayi dusunuyorsunuz?
```

**Chip butonlar:**
- "Bu hafta" → `this-week` (+25 skor)
- "Bu ay icinde" → `this-month` (+25 skor)
- "Bu ceyrek" → `this-quarter`
- "Henuz arastiriyorum" → `researching`
- "Atla" → null (skor degismez)

### Sonraki step
→ `summary`

---

## 7. Adim 5 — SUMMARY (Ozet + Onay)

Bot, topladigi bilgileri ozetler:

```
Sizi anladim ✓

📋 Talebinizin ozeti:
  • {name} / {company}
  • {email}
  • Niyetiniz: {intent_label}
  • Aylik {volume} siparis
  • Su anki cozum: {current_tool}
  • Baslangic: {timeline_label}

Bu bilgilerle ekibimize ileteyim mi?
```

**Butonlar:**
- "Evet, gonder" → submit
- "Bir seyi degistirmek istiyorum" → ilgili step'e geri don

**Submit sonrasi:**
```
Mukemmel! 🎉 Talebinizi olusturdum.
Ekibimizden bir uzman 24 saat icinde {email} adresinizden ulasacak.

Tercih ettiginiz bir iletisim saati var mi? (opsiyonel)
```

Bu son alan bos da kalabilir.

### Sonraki step
→ `submitted`

---

## 8. Ozel Senaryolar

### 8a. Ziyaretci tamamen kacarsa
- Inactivity 60sn → "Hala orada misiniz? Yardima ihtiyaciniz olursa buradayim 🙏"
- Inactivity 180sn → konusma `abandoned` olarak isaretlenir, mevcut bilgi kaydedilir (kismi lead)

### 8b. Kullanici fiyat sorarsa (her adimda olabilir)
**Aylin'in default cevabi:**
```
Fiyatlandirmamiz aylik siparis hacmi ve ihtiyaclariniza gore ozelleseiyor.
Talebinizi olusturduktan sonra ekibimiz size ozel bir teklif hazirlayacak.
Bu arada sizinle tanismaya devam edelim mi?
```

### 8c. Kullanici teknik soru sorarsa
```
Iyi bir soru! Bu detaylari sizin durumunuza gore degerlendirmek icin
teknik ekibimiz dogru kisi. Talebinizi olustururken bu sorunuzu da
ekleyeyim, donus yaparken cevabiyla geliriz. Olur mu?
```

### 8d. Kullanici kaba/spam yazarsa
- Kufurlu/anlamsiz mesaj → Gemini flag → konusma "rejected" durumuna gecer
- Bot sessiz kalir, "Yardimci olamiyorum, baska bir konuda destek olabilir miyim?" der
- 3 spam mesaj sonrasi konusma kapanir

### 8e. Konusma cok kisa (<30 saniye, <3 mesaj)
- Lead kaydedilir ama `temperature=cold`, score -15 cezasi

---

## 9. Validasyon Kurallari (Zod Semasi)

```typescript
const leadSchema = z.object({
  name: z.string().min(2).max(60),
  company: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  intent: z.enum(['demo','pricing','integration','support','other']).optional(),
  volume: z.enum(['<500','500-5k','5k-50k','50k+']).optional(),
  currentTool: z.string().max(200).optional(),
  timeline: z.enum(['this-week','this-month','this-quarter','researching']).optional(),
  preferredContactTime: z.string().max(100).optional(),

  // Spam/audit
  honeypot: z.string().max(0),       // bos olmali
  conversationDurationSec: z.number().int().min(0),
  transcript: z.array(z.object({
    role: z.enum(['user','assistant','system']),
    content: z.string(),
    timestamp: z.string(),
  })),
});
```

---

## 10. AI Ozet Uretimi (Submit'ten Sonra)

Lead kaydedildikten sonra, Gemini'ye 2. cagri:

**Prompt:**
```
Asagidaki konusmadan, NextReach satis ekibinin 30 saniyede anlamasi gereken
bir ozet cikar. Maksimum 2 cumle. Su soruyu cevapla:
"Bu kisi kim, neden burada, neden simdi?"

Konusma:
{transcript}

Lead bilgileri:
{lead_data}
```

**Ornek ciktil:**
> "Ayse Kaya / Mor Botani (kozmetik e-ticaret), Shopify'dan gocmek istiyor. Aylik 8k siparis, bu ay icinde ilerlemek istiyor. Hot lead."

Bu ozet `leads.ai_summary` kolonuna kaydedilir, admin'de detay panelinde ust kismda gosterilir.
