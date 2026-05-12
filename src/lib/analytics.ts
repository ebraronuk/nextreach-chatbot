/**
 * Hafif analytics adapter — vendor-agnostic.
 *
 * Dev:  console.log
 * Prod: NEXT_PUBLIC_ANALYTICS_BEACON_URL tanimliysa navigator.sendBeacon ile
 *       fire-and-forget POST. URL tanimsizsa sessizce no-op (build kirilmasin).
 *
 * sendBeacon kullaniyoruz cunku sayfa unload sirasinda (kullanici tab kapatirken)
 * bile guvenli POST yapar. fetch ile race condition var, beacon yok.
 *
 * Drop-off analizi: chat_step_entered event'leri, hangi step'te kullanicilar
 * birakiyor sorusuna cevap verir.
 */

type EventName =
  | "chat_opened"
  | "chat_closed"
  | "chat_step_entered"
  | "chat_submitted"
  | "chat_fallback_triggered"
  | "proactive_bubble_shown"
  | "proactive_bubble_dismissed"
  | "proactive_bubble_started_chat"
  | "cta_clicked";

interface BaseProps {
  /** Sayfa yolu — ornek: "/", "/admin" */
  path?: string;
  /** Sayfada gecirilen sure (sn). */
  durationSec?: number;
  /** Ek alanlar. */
  [key: string]: unknown;
}

import { clientEnv } from "@/lib/env";

const BEACON_URL = clientEnv.NEXT_PUBLIC_ANALYTICS_BEACON_URL;

export function track(event: EventName, props: BaseProps = {}): void {
  if (typeof window === "undefined") return;

  const enriched = {
    event,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
    ...props,
  };

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${event}`, enriched);
    return;
  }

  // Production
  if (!BEACON_URL) return;

  try {
    const payload = JSON.stringify(enriched);
    // sendBeacon her zaman fire-and-forget; unload sirasinda da gecer.
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(BEACON_URL, blob);
      return;
    }
    // Fallback: keepalive fetch
    void fetch(BEACON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    /* analytics asla uygulamayi bozmamali */
  }
}
