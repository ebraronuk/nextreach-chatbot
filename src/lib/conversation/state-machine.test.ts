/**
 * State machine testleri.
 *
 * Konusma motorunun her step icin dogru StepResult ureticini garanti ediyoruz.
 * Bu testler projenin "kalbi" — burada bir refactor break olursa konusma
 * akisi tamamen bozulur, ama UI'da hicbir sey gozukmeyebilir.
 */
import { describe, expect, it } from "vitest";
import { findNextEmptyStep, handleUserInput } from "./state-machine";
import { PAYLOAD } from "./payloads";

describe("greeting step", () => {
  it("intent payload geldiginde identity_name'e advance eder", () => {
    const r = handleUserInput("greeting", { text: "Demo", payload: "demo" });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") {
      expect(r.nextStep).toBe("identity_name");
      expect(r.updates.intent).toBe("demo");
    }
  });

  it("yalnizca selamlama yazinca clarify donar", () => {
    const r = handleUserInput("greeting", { text: "selam" });
    expect(r.kind).toBe("clarify");
  });

  it("argo/dismissive mesajda clarify donar (isim olarak alinmaz)", () => {
    const r = handleUserInput("greeting", { text: "naber kız" });
    expect(r.kind).toBe("clarify");
  });

  it("soru sorunca Gemini fallback'e gider", () => {
    const r = handleUserInput("greeting", { text: "fiyatiniz ne kadar?" });
    expect(r.kind).toBe("fallback");
  });

  it("kimlik sorusu ('insan misin ai misin') fallback'e gider", () => {
    const r = handleUserInput("greeting", { text: "insan misin ai misin" });
    expect(r.kind).toBe("fallback");
  });

  it("'sen kimsin' fallback'e gider", () => {
    const r = handleUserInput("greeting", { text: "sen kimsin" });
    expect(r.kind).toBe("fallback");
  });

  it("'pazaryeri destegi var mi' fallback'e gider", () => {
    const r = handleUserInput("greeting", { text: "Pazaryeri destegi var mi" });
    expect(r.kind).toBe("fallback");
  });

  it("anlamli ama niyetsiz metin 'other' intent ile advance eder", () => {
    const r = handleUserInput("greeting", { text: "Bilgi almak istiyorum" });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") {
      expect(r.updates.intent).toBe("other");
    }
  });

  it("gecersiz intent payload'i serbest metin gibi degerlendirilir", () => {
    // payload bilinmeyen string ise advance/clarify/fallback yollarindan birine gider
    const r = handleUserInput("greeting", { text: "Bir sey", payload: "invalid-intent" });
    expect(["advance", "clarify", "fallback"]).toContain(r.kind);
  });
});

describe("identity_name step", () => {
  it("gecerli isim advance eder", () => {
    const r = handleUserInput("identity_name", { text: "Ayse Kaya" });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") {
      expect(r.nextStep).toBe("identity_company");
      expect(r.updates.name).toBe("Ayse Kaya");
    }
  });

  it("refusal mesajinda clarify donar", () => {
    const r = handleUserInput("identity_name", { text: "vermem" });
    expect(r.kind).toBe("clarify");
  });

  it("argo mesajinda clarify donar", () => {
    const r = handleUserInput("identity_name", { text: "naber kız" });
    expect(r.kind).toBe("clarify");
  });

  it("soru sorulursa fallback", () => {
    const r = handleUserInput("identity_name", { text: "neden gerekli?" });
    expect(r.kind).toBe("fallback");
  });

  it("junk girdide clarify donar", () => {
    const r = handleUserInput("identity_name", { text: "..." });
    expect(r.kind).toBe("clarify");
  });
});

describe("identity_company step", () => {
  it("gecerli sirket adi advance eder", () => {
    const r = handleUserInput("identity_company", { text: "Acme Tekstil" });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") {
      expect(r.nextStep).toBe("identity_email");
      expect(r.updates.company).toBe("Acme Tekstil");
    }
  });

  it("refusal'da clarify", () => {
    const r = handleUserInput("identity_company", { text: "olmaz" });
    expect(r.kind).toBe("clarify");
  });
});

describe("identity_email step", () => {
  it("kurumsal email advance eder", () => {
    const r = handleUserInput("identity_email", { text: "ali@acme.com" });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") {
      expect(r.nextStep).toBe("qualification_volume");
      expect(r.updates.email).toBe("ali@acme.com");
      expect(r.updates.emailIsPersonal).toBe(false);
    }
  });

  it("kisisel email branch'e gider (gmail vs)", () => {
    const r = handleUserInput("identity_email", { text: "ali@gmail.com" });
    expect(r.kind).toBe("branch");
    if (r.kind === "branch") {
      expect(r.nextStep).toBe("identity_email_confirm_personal");
      expect(r.updates.emailIsPersonal).toBe(true);
    }
  });

  it("gecersiz format clarify donar", () => {
    const r = handleUserInput("identity_email", { text: "filan" });
    expect(r.kind).toBe("clarify");
  });
});

describe("identity_email_confirm_personal step", () => {
  it("KEEP payload qualification_volume'a gecer", () => {
    const r = handleUserInput("identity_email_confirm_personal", {
      text: "evet",
      payload: PAYLOAD.KEEP,
    });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") expect(r.nextStep).toBe("qualification_volume");
  });

  it("RETRY payload identity_email step'ine geri donduruyor", () => {
    const r = handleUserInput("identity_email_confirm_personal", {
      text: "tekrar",
      payload: PAYLOAD.RETRY,
    });
    expect(r.kind).toBe("branch");
    if (r.kind === "branch") expect(r.nextStep).toBe("identity_email");
  });

  it("payload yokken yeni kurumsal email girilirse advance eder", () => {
    const r = handleUserInput("identity_email_confirm_personal", {
      text: "ali@acme.com",
    });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") {
      expect(r.updates.email).toBe("ali@acme.com");
      expect(r.updates.emailIsPersonal).toBe(false);
    }
  });

  it("payload yokken yine kisisel email gelirse clarify", () => {
    const r = handleUserInput("identity_email_confirm_personal", {
      text: "ali@yahoo.com",
    });
    expect(r.kind).toBe("clarify");
  });
});

describe("qualification_volume step", () => {
  it("payload ile volume advance eder", () => {
    const r = handleUserInput("qualification_volume", { text: "x", payload: "500-5k" });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") {
      expect(r.nextStep).toBe("qualification_tool");
      expect(r.updates.volume).toBe("500-5k");
    }
  });

  it("serbest metinden volume tahmin edilebiliyor", () => {
    const r = handleUserInput("qualification_volume", { text: "Aylik 50k siparis" });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") expect(r.updates.volume).toBe("50k+");
  });

  it("anlamsiz metinde clarify", () => {
    const r = handleUserInput("qualification_volume", { text: "filan filan" });
    expect(r.kind).toBe("clarify");
  });
});

describe("qualification_tool step", () => {
  it("NONE payload timeline'a advance", () => {
    const r = handleUserInput("qualification_tool", { text: "x", payload: PAYLOAD.NONE });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") {
      expect(r.nextStep).toBe("timeline");
      expect(r.updates.currentTool).toContain("Henuz");
    }
  });

  it("gecerli arac adi advance eder", () => {
    const r = handleUserInput("qualification_tool", { text: "Shopify Analytics" });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") {
      expect(r.nextStep).toBe("timeline");
      expect(r.updates.currentTool).toBe("Shopify Analytics");
    }
  });

  it("soru sorulursa fallback", () => {
    const r = handleUserInput("qualification_tool", { text: "hangisini onerirsin?" });
    expect(r.kind).toBe("fallback");
  });
});

describe("timeline step", () => {
  it("SKIP payload summary'ye gecer ve timeline null", () => {
    const r = handleUserInput("timeline", { text: "atla", payload: PAYLOAD.SKIP });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") {
      expect(r.nextStep).toBe("summary");
      expect(r.updates.timeline).toBeNull();
    }
  });

  it("gecerli timeline payload advance eder", () => {
    const r = handleUserInput("timeline", { text: "x", payload: "this-week" });
    expect(r.kind).toBe("advance");
    if (r.kind === "advance") expect(r.updates.timeline).toBe("this-week");
  });

  it("serbest metin clarify (chip secimi bekleniyor)", () => {
    const r = handleUserInput("timeline", { text: "yarin" });
    expect(r.kind).toBe("clarify");
  });
});

describe("summary step", () => {
  it("CONFIRM payload submit eder", () => {
    const r = handleUserInput("summary", { text: "evet", payload: PAYLOAD.CONFIRM });
    expect(r.kind).toBe("submit");
  });

  it("EDIT payload clarify (faz 1'de edit akisi yok)", () => {
    const r = handleUserInput("summary", { text: "duzelt", payload: PAYLOAD.EDIT });
    expect(r.kind).toBe("clarify");
  });

  it("payload olmadan clarify", () => {
    const r = handleUserInput("summary", { text: "tamam" });
    expect(r.kind).toBe("clarify");
  });
});

describe("submitted step", () => {
  it("her input fallback ile yanitlanir", () => {
    const r = handleUserInput("submitted", { text: "tekrar deneyebilir miyim?" });
    expect(r.kind).toBe("fallback");
  });
});

describe("findNextEmptyStep (tool loop / slot extraction auto-advance)", () => {
  it("hicbir slot dolu degilse mevcut step'i doner", () => {
    expect(findNextEmptyStep("greeting", {})).toBe("greeting");
    expect(findNextEmptyStep("identity_name", {})).toBe("identity_name");
  });

  it("name dolu, baska bir sey yok → identity_company'e atlar", () => {
    expect(findNextEmptyStep("greeting", { intent: "demo", name: "Ahmet" })).toBe(
      "identity_company",
    );
  });

  it("name + company dolu → identity_email'e atlar", () => {
    expect(
      findNextEmptyStep("greeting", {
        intent: "demo",
        name: "Ahmet",
        company: "Acme",
      }),
    ).toBe("identity_email");
  });

  it("intent + name + company + email + volume dolu → qualification_tool'a atlar", () => {
    expect(
      findNextEmptyStep("greeting", {
        intent: "demo",
        name: "Ahmet",
        company: "Acme",
        email: "ahmet@acme.com",
        volume: "5k-50k",
      }),
    ).toBe("qualification_tool");
  });

  it("her sey dolu → summary'ye gider", () => {
    expect(
      findNextEmptyStep("greeting", {
        intent: "demo",
        name: "Ahmet",
        company: "Acme",
        email: "ahmet@acme.com",
        volume: "5k-50k",
        currentTool: "Shopify",
        timeline: "this-week",
      }),
    ).toBe("summary");
  });
});
