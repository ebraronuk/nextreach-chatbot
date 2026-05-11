# Design System — NextReach Chatbot

> Kodlama sirasinda referans alacagimiz tasarim sistemi.
> Renk seciminden buton boyutuna kadar her sey burada.

---

## 1. Marka Kimligi

**NextReach** = orta olcekli e-ticaret firmalarina **analitik dashboard** sunan B2B SaaS.

| Duygu | Renk / Stil |
|---|---|
| Guven, profesyonel | Lacivert / koyu mavi |
| Veri, analitik | Mavi tonlari |
| Modern, hizli | Beyaz alan, sade |
| Sicakkanli (chatbot icin) | Bir aksan rengi |

**Kacinilacaklar:**
- Cocuksu, oyuncak hisseli renkler (turuncu / pembe vurgu yok)
- Asiri gradient
- 3'ten fazla renk
- Yuvarlak buton + buyuk emoji kombosu (B2B'ye uymaz)

---

## 2. Renk Paleti (Tailwind)

```
Brand (mavi tonlari):
  brand-50   #eff6ff   →  Cok acik arka plan (chat balonu zemini)
  brand-100  #dbeafe   →  Hover, vurgu
  brand-500  #3b82f6   →  Linkler, sekonder vurgu
  brand-600  #2563eb   →  PRIMARY (CTA butonu, "Bize Ulasin")
  brand-700  #1d4ed8   →  Hover (CTA buton)
  brand-900  #1e3a8a   →  Heading vurgular, footer

Slate (notr / metin):
  slate-50   #f8fafc   →  Sayfa arka plan
  slate-100  #f1f5f9   →  Kart / panel arka plan
  slate-200  #e2e8f0   →  Border, ayrac
  slate-400  #94a3b8   →  Yardimci metin, placeholder
  slate-600  #475569   →  Govde metin
  slate-900  #0f172a   →  Heading, ana metin

Skor renkleri (admin tablosunda):
  hot   →  red-600 / red-50 zemin  →  acil, sicak lead
  warm  →  amber-600 / amber-50    →  ilgili ama beklemede
  cold  →  slate-400 / slate-50    →  dusuk oncelik

Sistem renkleri:
  success  green-600    →  basarili gonderim
  error    red-600      →  validation hatalari
  warning  amber-600    →  spam flag, eksik bilgi
```

---

## 3. Tipografi

**Font:** `Inter` (Google Fonts, `src/app/layout.tsx`'te yuklendi).

| Eleman | Tailwind sinifi | Ornek |
|---|---|---|
| H1 (landing hero) | `text-5xl md:text-6xl font-bold tracking-tight` | "Verisini bizimle yonet" |
| H2 (bolum baslik) | `text-3xl font-semibold tracking-tight` | "Neden NextReach?" |
| H3 | `text-xl font-semibold` | Admin tablo basliklari |
| Govde | `text-base text-slate-600` | Aciklamalar |
| Kucuk | `text-sm text-slate-500` | Yardimci metin, timestamp |
| Cok kucuk | `text-xs text-slate-400` | Footer, meta |
| Chat mesaji | `text-sm leading-relaxed` | Konusma balonlari |

---

## 4. Bilesen Patternleri

### Buton (Primary CTA)
```tsx
<button
  className="rounded-full bg-brand-600 px-6 py-3 text-white font-medium
             shadow-lg hover:bg-brand-700 transition focus-visible:outline-2
             focus-visible:outline-offset-2 focus-visible:outline-brand-600"
>
  Bize Ulasin
</button>
```

### Buton (Sekonder)
```tsx
<button
  className="rounded-full border border-slate-200 px-6 py-3 text-slate-700
             font-medium hover:bg-slate-50 transition"
>
  Daha fazla bilgi
</button>
```

### Input
```tsx
<input
  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm
             placeholder:text-slate-400 focus:border-brand-500
             focus:ring-2 focus:ring-brand-100 outline-none transition"
/>
```

### Kart
```tsx
<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  ...
</div>
```

### Mesaj balonu — Asistan (Aylin)
```tsx
<div className="self-start max-w-[85%] rounded-2xl rounded-tl-md
                bg-slate-100 px-4 py-3 text-sm text-slate-700">
  Merhaba, ben Aylin. Size nasil yardimci olabilirim?
</div>
```

### Mesaj balonu — Kullanici
```tsx
<div className="self-end max-w-[85%] rounded-2xl rounded-tr-md
                bg-brand-600 px-4 py-3 text-sm text-white">
  Demo gormek istiyorum
</div>
```

### Hizli cevap butonu (chatbot icinde)
```tsx
<button className="rounded-full border border-brand-200 bg-white px-3 py-1
                   text-xs text-brand-700 hover:bg-brand-50 transition">
  Demo gormek istiyorum
</button>
```

### Skor rozeti (admin tablosunda)
```tsx
{/* Hot */}
<span className="inline-flex items-center gap-1 rounded-full bg-red-50
                 px-2.5 py-0.5 text-xs font-medium text-red-700">
  Hot 92
</span>

{/* Warm */}
<span className="inline-flex items-center gap-1 rounded-full bg-amber-50
                 px-2.5 py-0.5 text-xs font-medium text-amber-700">
  Warm 67
</span>

{/* Cold */}
<span className="inline-flex items-center gap-1 rounded-full bg-slate-100
                 px-2.5 py-0.5 text-xs font-medium text-slate-600">
  Cold 34
</span>
```

---

## 5. Spacing (Tailwind Olceginde)

| Kullanim | Tailwind |
|---|---|
| Kart ic padding | `p-6` |
| Section dikey margin | `py-16 md:py-24` |
| Bilesen arasi mesafe | `space-y-4` veya `gap-4` |
| Chat balonu margin | `mb-3` |
| Maksimum sayfa genisligi | `max-w-6xl mx-auto` |
| Maksimum chat genisligi | `w-[420px]` (desktop), `w-full` (mobile) |

---

## 6. Animasyonlar (Hafif Dokunuslar)

| Yer | Animasyon |
|---|---|
| Chatbot acilisi | `animate-slide-up` (tanimli, 300ms ease-out) |
| Buton hover | `transition` + renk degisimi (varsayilan) |
| Mesaj gelirken | Tek tek belirim (CSS keyframe veya transform) |
| Yazma gostergesi | 3 nokta `animate-pulse` |
| Yeni lead admin'de | Satir kisa bir `bg-amber-50` highlight'i |

---

## 7. Mobile (Brief'te Onemli)

| Ekran | Davranis |
|---|---|
| Mobile chatbot | Tam ekran modal (bottom sheet) |
| Mobile landing | Tek sutun, buyuk CTA |
| Mobile admin | Yatay scroll yerine kart gorunumu |

Tailwind breakpoint'leri:
```
sm: 640px    ← tablet portrait
md: 768px    ← tablet landscape  
lg: 1024px   ← laptop
xl: 1280px   ← desktop
```

**Mobile-first kod yaz:** `<div className="p-4 md:p-8">` (kucuk olan default, md ile buyut).

---

## 8. Erisilebilirlik (A11y)

- Tum interaktif elemanlarda `aria-label` (ozellikle ikonlu butonlarda)
- `focus-visible` ile gorunur focus halkasi
- Renk kontrasti min WCAG AA (brand-600 + beyaz: gecer)
- Chat'te yeni mesaj geldikce `aria-live="polite"` ile screen reader bildirsin
- Escape tusu modal'i kapatsin

---

## 9. Copywriting (Metin Kararlari)

### Landing
- **Hero baslik:** "E-ticaretinizi veriyle buyuten dashboard"
- **Alt baslik:** "300+ marka, gercek zamanli sipariş, stok ve müşteri verilerini NextReach ile yönetiyor."
- **CTA:** "Bize Ulasin" (Get a Demo degil — Turkce)
- **Sekonder CTA:** "Daha fazla bilgi"

### Chatbot
- **Acilis:** "Merhaba 👋 Ben Aylin, NextReach satis danismaniyim. Bugun size nasil yardimci olabilirim?"
- **Hizli cevap onerileri:** "Demo gormek istiyorum" / "Fiyatlandirma" / "Entegrasyonu sormak istiyorum"
- **Onay ekrani:** "Talebinizi olusturdum! Ekibimiz 24 saat icinde size donus yapacak."
- **Hata:** "Ufak bir terslik oldu, tekrar dener misiniz?"

### Admin
- **Bos durum:** "Henuz lead yok. Konusan ziyaretciler burada belirecek."
- **Skor aciklamasi:** "Skor breakdown'i: kurumsal e-posta +25, yuksek hacim +30..."

---

## 10. NOT YAPILACAKLAR

- Animasyonlu emoji
- Otomatik calan ses
- Pop-up "indir/abone ol" cagrisi
- Kullanicinin onayi olmadan acilan chatbot
- Karanlik mod (6 saatte gerek yok)
- Buyuk gradient header
- Loading spinner yerine skeleton loader tercih et (daha pro his)
