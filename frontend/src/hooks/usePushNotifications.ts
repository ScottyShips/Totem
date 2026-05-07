"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";

const STORAGE_KEY = "totem:notif:asked";

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

async function registerSubscriptionWithBackend(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    const { public_key } = await apiFetch<{ public_key: string | null }>(
      "/api/v1/push/vapid-public-key",
    );
    if (!public_key) return;

    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(public_key) as BufferSource,
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys) return;

  await apiFetch("/api/v1/push/subscriptions", {
    method: "POST",
    body: {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    },
  });
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
      registerSubscriptionWithBackend().catch(() => {});
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

    if (result === "granted") {
      try {
        await registerSubscriptionWithBackend();
      } catch {
        // Subscription failure is non-fatal — user can re-trigger via /account later
      }
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
