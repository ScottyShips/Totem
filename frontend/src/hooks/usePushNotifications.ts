"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "totem:notif:asked";

export function usePushNotifications() {
  const [asked, setAsked] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const isSupported = "Notification" in window;
    setSupported(isSupported);
    if (isSupported) setPermission(Notification.permission);
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") setAsked(true);
    } catch {}
  }, []);

  const shouldPrompt = supported && !asked && permission === "default";

  const requestPermission = useCallback(async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
    setAsked(true);
  }, []);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
    setAsked(true);
  }, []);

  return { shouldPrompt, requestPermission, dismiss };
}
