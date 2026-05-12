/**
 * Lead scoring icin unit testler.
 *
 * Brief'in C3 sorusunun cevabini (iyi vs kotu lead) test ile dogruluyoruz —
 * algoritma degisirse hangi senaryolarda regression cikiyor anlik gorulur.
 */
import { describe, expect, it } from "vitest";
import { scoreLead, isCorporateEmail } from "./score";

describe("isCorporateEmail", () => {
  it("kisisel saglayicilari kurumsal saymaz", () => {
    expect(isCorporateEmail("user@gmail.com")).toBe(false);
    expect(isCorporateEmail("user@hotmail.com.tr")).toBe(false);
    expect(isCorporateEmail("user@yahoo.com")).toBe(false);
    expect(isCorporateEmail("user@protonmail.com")).toBe(false);
  });

  it("kurumsal domain'leri dogru tespit eder", () => {
    expect(isCorporateEmail("ceo@acme.com")).toBe(true);
    expect(isCorporateEmail("info@nextreach.io")).toBe(true);
    expect(isCorporateEmail("test@kurumsal.com.tr")).toBe(true);
  });

  it("bozuk email girdilerinde guvenli kalir", () => {
    expect(isCorporateEmail("notanemail")).toBe(true); // domain yok -> personal_email match etmiyor
    expect(isCorporateEmail("@nodomain")).toBe(true);
    expect(isCorporateEmail("")).toBe(true);
  });
});

describe("scoreLead", () => {
  it("hot lead — kurumsal email + yuksek hacim + yakin zaman", () => {
    const result = scoreLead({
      name: "Ayse Kaya",
      company: "Mor Botanik",
      email: "ayse@morbotanik.com",
      volume: "5k-50k",
      timeline: "this-week",
      currentTool: "Shopify Analytics",
    });
    expect(result.temperature).toBe("hot");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.breakdown.length).toBeGreaterThanOrEqual(4);
  });

  it("cold lead — kisisel email + dusuk hacim + arastirma", () => {
    const result = scoreLead({
      name: "Test",
      company: "X",
      email: "test@gmail.com",
      volume: "<500",
      timeline: "researching",
      conversationDurationSec: 20,
    });
    expect(result.temperature).toBe("cold");
    expect(result.score).toBeLessThan(50);
    // Kisa konusma cezasi uygulandı
    expect(result.breakdown.some((b) => b.delta < 0)).toBe(true);
  });

  it("warm lead — orta hacim + bu ay", () => {
    const result = scoreLead({
      name: "Mehmet",
      company: "Y Ltd",
      email: "mehmet@yltd.com.tr",
      volume: "500-5k",
      timeline: "this-month",
    });
    expect(result.temperature).toBe("warm");
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.score).toBeLessThan(80);
  });

  it("breakdown her +/- maddenin neden ve delta'sini icerir", () => {
    const result = scoreLead({
      name: "A",
      company: "B",
      email: "a@b.com",
      volume: "50k+",
    });
    for (const item of result.breakdown) {
      expect(typeof item.reason).toBe("string");
      expect(typeof item.delta).toBe("number");
      expect(item.reason.length).toBeGreaterThan(0);
    }
  });

  it("score 0-100 araliginda kalir (clamp)", () => {
    const result = scoreLead({
      name: "A",
      company: "B",
      email: "a@b.com",
      volume: "5k-50k",
      timeline: "this-week",
      currentTool: "Shopify Analytics + Klaviyo + Mixpanel",
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
