"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

const STORAGE_KEY = "totem:notif:asked";
const SUBSCRIBE_TIMEOUT_MS = 15000;

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

// Waits for a service worker to reach the "activated" state. Returns when the
// SW is active or the worker becomes redundant (failed install).
function waitForActivation(sw: ServiceWorker): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (sw.state === "activated") {
      resolve();
      return;
    }
    const handler = () => {
      beacon("sw-statechange", sw.state);
      if (sw.state === "activated") {
        sw.removeEventListener("statechange", handler);
        resolve();
      } else if (sw.state === "redundant") {
        sw.removeEventListener("statechange", handler);
        reject(new Error("sw-redundant"));
      }
    };
    sw.addEventListener("statechange", handler);
  });
}

// Resolves with a registration that has an active SW. iOS PWA can leave behind
// a "phantom" registration object whose installing/waiting/active slots are
// all null — `serviceWorker.ready` never resolves in that state. We detect the
// phantom, unregister it, then register fresh and wait for activation.
async function ensureActiveServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing && !existing.installing && !existing.waiting && !existing.active) {
    beacon("phantom-detected");
    await existing.unregister();
    beacon("phantom-unregistered");
  }

  beacon("registering");
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  beacon(
    "registered",
    `installing=${reg.installing?.state ?? null} waiting=${reg.waiting?.state ?? null} active=${reg.active?.state ?? null}`,
  );

  if (reg.active && !reg.installing && !reg.waiting) {
    return reg;
  }

  const sw = reg.installing ?? reg.waiting ?? reg.active;
  if (!sw) {
    throw new Error("registration has no sw after register()");
  }
  await waitForActivation(sw);
  return reg;
}

async function registerSubscriptionWithBackend(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    beacon("unsupported");
    return;
  }

  beacon("ensuring-sw");
  const reg = await ensureActiveServiceWorker();
  beacon("sw-active");

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
// Module-level in-flight promise dedupes the user-grant call and the
// permission-effect call that fire concurrently when permission flips to
// "granted" — without it, both race and we double-register.
let inFlightRegister: Promise<void> | null = null;

async function registerWithTimeout(): Promise<void> {
  if (inFlightRegister) return inFlightRegister;
  const timeout = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error("subscribe-timeout")), SUBSCRIBE_TIMEOUT_MS),
  );
  inFlightRegister = (async () => {
    try {
      await Promise.race([registerSubscriptionWithBackend(), timeout]);
    } catch (err) {
      beacon("error", err instanceof Error ? err.message : String(err));
    } finally {
      inFlightRegister = null;
    }
  })();
  return inFlightRegister;
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
