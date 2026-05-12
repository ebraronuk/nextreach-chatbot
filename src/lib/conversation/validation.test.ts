/**
 * Conversation validation kurallarinin testleri.
 *
 * Real-world edge case'ler:
 *  - "naber kız" -> dismissive, isim olarak alinmamali
 *  - "olmaz" -> refusal, name olarak kabul edilmemeli
 *  - "selam" -> pure greeting, niyet seçimine geri yonlendirilmeli
 *  - "fiyat ne kadar?" -> soru, fallback'e gitmeli
 */
import { describe, expect, it } from "vitest";
import {
  isDismissive,
  isPureGreeting,
  looksLikeGibberish,
  looksLikeQuestion,
  looksLikeRefusal,
  parseCompany,
  parseEmail,
  parseName,
} from "./validation";

describe("isPureGreeting", () => {
  it("yaygin Turkce selamlamalari yakalar", () => {
    expect(isPureGreeting("selam")).toBe(true);
    expect(isPureGreeting("merhaba")).toBe(true);
    expect(isPureGreeting("naber")).toBe(true);
    expect(isPureGreeting("iyi günler")).toBe(true);
    expect(isPureGreeting("günaydın")).toBe(true);
    expect(isPureGreeting("hey")).toBe(true);
  });

  it("normal mesajlari selamlama saymaz", () => {
    expect(isPureGreeting("Ayşe Kaya")).toBe(false);
    expect(isPureGreeting("Demo almak istiyorum")).toBe(false);
    expect(isPureGreeting("acme.com")).toBe(false);
  });
});

describe("isDismissive", () => {
  it("argo/cinsiyetci hitap kaliplarini yakalar", () => {
    expect(isDismissive("naber kız")).toBe(true);
    expect(isDismissive("naber kız!")).toBe(true);
    expect(isDismissive("selam canım")).toBe(true);
    expect(isDismissive("merhaba güzelim")).toBe(true);
  });

  it("profesyonel mesajlari yanlis pozitif vermez", () => {
    expect(isDismissive("Ayşe Kaya")).toBe(false);
    expect(isDismissive("Demo istiyorum")).toBe(false);
    expect(isDismissive("Acme Tekstil")).toBe(false);
  });
});

describe("looksLikeRefusal", () => {
  it("ret kelimelerini yakalar", () => {
    expect(looksLikeRefusal("olmaz")).toBe(true);
    expect(looksLikeRefusal("yok")).toBe(true);
    expect(looksLikeRefusal("hayır")).toBe(true);
    expect(looksLikeRefusal("vermem")).toBe(true);
    expect(looksLikeRefusal("istemiyorum")).toBe(true);
    expect(looksLikeRefusal("söylemem")).toBe(true);
    expect(looksLikeRefusal("atla")).toBe(true);
    expect(looksLikeRefusal("skip")).toBe(true);
    expect(looksLikeRefusal("no")).toBe(true);
  });

  it("isim icinde gecen kelimeleri yanlis pozitif vermez", () => {
    // "Yokuş" -> yok kelimesi icermez (kelime sınırı)
    expect(looksLikeRefusal("Yokuş Sokak")).toBe(false);
    // "Hayır Hanım" -> sadece icinde "hayır" gectigi icin yine match olur, kullanici icin nadir senaryo
    expect(looksLikeRefusal("Ayşe")).toBe(false);
    expect(looksLikeRefusal("Mehmet")).toBe(false);
  });

  it("uzun cumlelerde ret kelimesi yakalar", () => {
    expect(looksLikeRefusal("söylemek istemiyorum")).toBe(true);
    expect(looksLikeRefusal("vermek istemiyorum")).toBe(true);
  });
});

describe("looksLikeQuestion", () => {
  it("Turkce soru kaliplarini yakalar", () => {
    expect(looksLikeQuestion("fiyat ne kadar?")).toBe(true);
    expect(looksLikeQuestion("ne kadara mal oluyor")).toBe(true);
    expect(looksLikeQuestion("nasıl çalışıyor?")).toBe(true);
    expect(looksLikeQuestion("hangi paketler var?")).toBe(true);
    expect(looksLikeQuestion("demo nasıl yapılıyor")).toBe(true);
  });

  it("kimlik sorularini yakalar (insan/ai/bot misin)", () => {
    expect(looksLikeQuestion("insan misin ai misin")).toBe(true);
    expect(looksLikeQuestion("insan mısın ai mısın")).toBe(true);
    expect(looksLikeQuestion("bot musun")).toBe(true);
    expect(looksLikeQuestion("yapay zeka misin")).toBe(true);
    expect(looksLikeQuestion("yapay zekâ mısın")).toBe(true);
    expect(looksLikeQuestion("sen kimsin")).toBe(true);
    expect(looksLikeQuestion("kimsin")).toBe(true);
    expect(looksLikeQuestion("gercek misin")).toBe(true);
    expect(looksLikeQuestion("asistan misin")).toBe(true);
  });

  it("infix soru kaliplarini yakalar (... var mi, ... destekliyor mu)", () => {
    expect(looksLikeQuestion("Pazaryeri destegi var mi")).toBe(true);
    expect(looksLikeQuestion("Trendyol ile uyumlu mu")).toBe(true);
    expect(looksLikeQuestion("Shopify destekliyor mu")).toBe(true);
    expect(looksLikeQuestion("aylik ne kadar tutar")).toBe(true);
    expect(looksLikeQuestion("Excel'e export yapabilir mi")).toBe(true);
  });

  it("normal cevaplari soru saymaz", () => {
    expect(looksLikeQuestion("Ayşe")).toBe(false);
    expect(looksLikeQuestion("Acme Tekstil")).toBe(false);
    expect(looksLikeQuestion("Mehmet Ali")).toBe(false);
    expect(looksLikeQuestion("Demo almak istiyorum")).toBe(false);
  });
});

describe("looksLikeGibberish", () => {
  it("rastgele tus kombinasyonlarini yakalar", () => {
    expect(looksLikeGibberish("hgdsghsdghdsü")).toBe(true);
    expect(looksLikeGibberish("jhfhg")).toBe(true);
    expect(looksLikeGibberish("asdfgh")).toBe(true);
    expect(looksLikeGibberish("qwertyu")).toBe(true);
    expect(looksLikeGibberish("zxcvbnm")).toBe(true);
    expect(looksLikeGibberish("kfdjksl")).toBe(true);
  });

  it("Turkce gercek isimleri yanlis pozitifle yakalamaz", () => {
    expect(looksLikeGibberish("Ayşe")).toBe(false);
    expect(looksLikeGibberish("Mehmet")).toBe(false);
    expect(looksLikeGibberish("Zeynep")).toBe(false);
    expect(looksLikeGibberish("Çelik")).toBe(false);
    expect(looksLikeGibberish("Yıldız")).toBe(false);
    expect(looksLikeGibberish("Cengiz")).toBe(false);
    expect(looksLikeGibberish("Müğla-Köyceğiz")).toBe(false);
    expect(looksLikeGibberish("Zeynep Yıldız")).toBe(false);
  });

  it("sirket adlarini yanlis pozitifle yakalamaz", () => {
    expect(looksLikeGibberish("Acme Tekstil")).toBe(false);
    expect(looksLikeGibberish("Mor Botanik")).toBe(false);
    expect(looksLikeGibberish("Garanti BBVA")).toBe(false);
    expect(looksLikeGibberish("Shopify")).toBe(false);
    expect(looksLikeGibberish("Bireysel")).toBe(false);
  });

  it("cok kisa girdileri (3 char alti) gibberish saymaz", () => {
    // Bu uzunlukta zaten Zod min(2) kuralina takilir; biz burada false dondur
    expect(looksLikeGibberish("Al")).toBe(false);
    expect(looksLikeGibberish("Pi")).toBe(false);
  });
});

describe("parseName — gibberish katmani", () => {
  it("'hgdsghsdghdsü' isim olarak kabul ETMEZ", () => {
    const r = parseName("hgdsghsdghdsü");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("junk");
  });

  it("'jhfhg' isim olarak kabul ETMEZ", () => {
    const r = parseName("jhfhg");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("junk");
  });

  it("'asdfgh' isim olarak kabul ETMEZ", () => {
    const r = parseName("asdfgh");
    expect(r.ok).toBe(false);
  });
});

describe("parseCompany — gibberish katmani", () => {
  it("'kfdjksl' sirket adi olarak kabul ETMEZ", () => {
    const r = parseCompany("kfdjksl");
    expect(r.ok).toBe(false);
  });

  it("'hgdsghsdghdsü' sirket adi olarak kabul ETMEZ", () => {
    const r = parseCompany("hgdsghsdghdsü");
    expect(r.ok).toBe(false);
  });
});

describe("parseName — refusal & dismissive katmanı", () => {
  it("'olmaz' isim olarak kabul ETMEZ", () => {
    const r = parseName("olmaz");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("refusal");
  });

  it("'yok' isim olarak kabul ETMEZ", () => {
    const r = parseName("yok");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("refusal");
  });

  it("'vermem' isim olarak kabul ETMEZ", () => {
    const r = parseName("vermem");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("refusal");
  });

  it("normal isimleri kabul eder", () => {
    expect(parseName("Ayşe").ok).toBe(true);
    expect(parseName("Mehmet Ali").ok).toBe(true);
    expect(parseName("Zeynep").ok).toBe(true);
  });

  it("junk/emoji-only isim kabul ETMEZ", () => {
    const r = parseName("🚀🚀");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("junk");
  });

  it("cok kisa (1 char) isim kabul ETMEZ", () => {
    expect(parseName("A").ok).toBe(false);
  });
});

describe("parseCompany — refusal katmanı", () => {
  it("'olmaz' sirket adi olarak kabul ETMEZ", () => {
    const r = parseCompany("olmaz");
    expect(r.ok).toBe(false);
  });

  it("'Bireysel' kabul edilir (gercek kullanim)", () => {
    expect(parseCompany("Bireysel").ok).toBe(true);
  });

  it("normal sirket adlari", () => {
    expect(parseCompany("Acme Tekstil").ok).toBe(true);
    expect(parseCompany("Mor Botanik A.Ş.").ok).toBe(true);
  });
});

describe("parseEmail — refusal katmanı", () => {
  it("'vermem' email olarak kabul ETMEZ — refusal mesaji doner", () => {
    const r = parseEmail("vermem");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("refusal");
  });

  it("kurumsal email kabul edilir, isPersonal=false", () => {
    const r = parseEmail("ahmet@acme.com");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe("ahmet@acme.com");
      expect(r.value.isPersonal).toBe(false);
    }
  });

  it("gmail kabul edilir ama isPersonal=true", () => {
    const r = parseEmail("user@gmail.com");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.isPersonal).toBe(true);
  });

  it("bozuk format kabul ETMEZ", () => {
    expect(parseEmail("abc@").ok).toBe(false);
    expect(parseEmail("notanemail").ok).toBe(false);
  });
});
