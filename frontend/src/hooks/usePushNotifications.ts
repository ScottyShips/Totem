"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

const STORAGE_KEY = "totem:notif:asked";
const SUBSCRIBE_TIMEOUT_MS = 8000;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Browser PushManager.subscribe requires the VAPID public key as a Uint8Array,
  // and our backend serves it as base64url with no padding.
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

// TEMPORARY — fire-and-forget step log so we can see in Railway exactly where
// the iOS PWA push subscribe flow hangs. Remove all `beacon()` call sites and
// the /push/debug-log route once the root cause is resolved.
function beacon(step: string, detail?: string): void {
  apiFetch("/api/v1/push/debug-log", {
    method: "POST",
    body: { step, detail: detail ?? null },
  }).catch(() => {});
}

async function registerSubscriptionWithBackend(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    beacon("unsupported");
    return;
  }

  // TEMPORARY DIAGNOSTIC — probe SW registration state before awaiting ready,
  // so we can tell "never registered" apart from "registered but not active".
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) {
      const snapshot = {
        scope: existing.scope,
        installing: existing.installing?.state ?? null,
        waiting: existing.waiting?.state ?? null,
        active: existing.active?.state ?? null,
      };
      beacon("existing-registration", JSON.stringify(snapshot));
    } else {
      beacon("no-registration");
      try {
        const fresh = await navigator.serviceWorker.register("/sw.js");
        beacon("explicit-register-ok", `scope=${fresh.scope}`);
      } catch (err) {
        beacon(
          "explicit-register-failed",
          err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        );
      }
    }
  } catch (err) {
    beacon(
      "registration-probe-failed",
      err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    );
  }

  beacon("awaiting-sw-ready");
  const reg = await navigator.serviceWorker.ready;
  beacon("sw-ready");

  let sub = await reg.pushManager.getSubscription();
  beacon(sub ? "existing-sub" : "no-sub");

  if (!sub) {
    beacon("fetching-vapid");
    const { public_key } = await apiFetch<{ public_key: string | null }>(
      "/api/v1/push/vapid-public-key",
    );
    if (!public_key) {
      beacon("vapid-empty");
      return;
    }
    beacon("vapid-fetched");

    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(public_key) as BufferSource,
    });
    beacon("subscribed");
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys) {
    beacon("sub-json-incomplete");
    return;
  }

  beacon("posting-subscription");
  await apiFetch("/api/v1/push/subscriptions", {
    method: "POST",
    body: {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    },
  });
  beacon("posted");
}

// Wraps registration in a hard timeout so a hang in any underlying step
// (most commonly `serviceWorker.ready` on iOS PWA) cannot wedge the UI.
async function registerWithTimeout(): Promise<void> {
  const timeout = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error("subscribe-timeout")), SUBSCRIBE_TIMEOUT_MS),
  );
  try {
    await Promise.race([registerSubscriptionWithBackend(), timeout]);
  } catch (err) {
    beacon("error", err instanceof Error ? err.message : String(err));
  }
}

export function usePushNotifications() {
  const [asked, setAsked] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const isSupported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setSupported(isSupported);
    if ("Notification" in window) setPermission(Notification.permission);
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") setAsked(true);
    } catch {}
  }, []);

  // If the user already granted permission in a past session, make sure the
  // backend has their subscription. Cheap idempotent operation.
  useEffect(() => {
    if (supported && permission === "granted") {
      registerWithTimeout();
    }
  }, [supported, permission]);

  const shouldPrompt = supported && !asked && permission === "default";

  const requestPermission = useCallback(async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setAsked(true);
    beacon("permission-result", result);

    if (result === "granted") {
      await registerWithTimeout();
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setAsked(true);
  }, []);

  return { shouldPrompt, requestPermission, dismiss };
}
