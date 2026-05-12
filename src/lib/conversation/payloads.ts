/**
 * Quick reply meta-payload sabitleri.
 *
 * Bu degerler kullanici tarafindan yazilmaz; sadece chip butonlari tarafindan
 * fire edilir. `__xxx__` formati intent/volume/timeline gibi gercek payload'larla
 * karismasin diye — bos string degil, mesela "skip" Volume "<500"e benzemesin.
 *
 * state-machine.ts ve scripts.ts ayni sabit setini kullanmali ki refactor'da
 * tutarsizlik olmasin.
 */
export const PAYLOAD = {
  /** Timeline step'inde "Atla" chip'i. */
  SKIP: "__skip__",
  /** Summary step'inde "Evet, gonder". */
  CONFIRM: "__confirm__",
  /** Summary step'inde "Bir seyi degistirmek istiyorum". */
  EDIT: "__edit__",
  /** Personal email confirm step'inde "Bu adresle devam". */
  KEEP: "__keep__",
  /** Personal email confirm step'inde "Sirket e-postasi gireyim". */
  RETRY: "__retry__",
  /** Tool step'inde "Hicbir sey kullanmiyoruz". */
  NONE: "__none__",
} as const;

export type MetaPayload = (typeof PAYLOAD)[keyof typeof PAYLOAD];
