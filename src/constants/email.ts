/**
 * Paylasilan e-posta domain listeleri.
 * validation.ts, scoring/score.ts ve api/leads/route.ts buradan import eder.
 *
 * Tum email taxonomy tek dosyada: PERSONAL (ucretsiz mail saglayicilari)
 * + DISPOSABLE (gecici/throwaway mail). Listede gunculleme yapilirsa tum
 * uretici tek yerden senkronize olur.
 */

/** Kisisel/ucretsiz e-posta saglayicilari. Kurumsal lead skoru -25. */
export const PERSONAL_EMAIL_DOMAINS = new Set<string>([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.com.tr",
  "outlook.com",
  "outlook.com.tr",
  "live.com",
  "yahoo.com",
  "yahoo.com.tr",
  "icloud.com",
  "me.com",
  "mac.com",
  "yandex.com",
  "yandex.com.tr",
  "protonmail.com",
  "proton.me",
  "aol.com",
  "mail.com",
  "gmx.com",
]);

/**
 * Throwaway / disposable e-posta saglayicilari. Bu domainlerden gelen lead
 * spam riskli kabul edilir; submit anında 400 ile reddedilir (kullaniciya
 * "kurumsal e-posta kullanin" mesaji).
 *
 * Tam liste icin ileride `disposable-email-domains` paketi entegre edilebilir;
 * MVP icin en yaygin 18 domain yeter.
 */
export const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "sharklasers.com",
  "yopmail.com",
  "throwawaymail.com",
  "maildrop.cc",
  "trashmail.com",
  "getnada.com",
  "dispostable.com",
  "fakeinbox.com",
  "mintemail.com",
  "spam4.me",
  "33mail.com",
  "trbvm.com",
]);

function emailDomain(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ?? null;
}

export function isPersonalEmail(email: string): boolean {
  const domain = emailDomain(email);
  return Boolean(domain && PERSONAL_EMAIL_DOMAINS.has(domain));
}

export function isCorporateEmail(email: string): boolean {
  return !isPersonalEmail(email);
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  return Boolean(domain && DISPOSABLE_EMAIL_DOMAINS.has(domain));
}
