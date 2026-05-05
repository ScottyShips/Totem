"use client";

import { useEffect, useState } from "react";

export default function OfflineBanner() {
  // Initialize to true to avoid hydration mismatch — corrected on mount
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-zinc-800 border-t border-zinc-700 px-4 py-3 text-center">
      <p className="text-zinc-300 text-sm">You&apos;re offline — showing last synced data</p>
    </div>
  );
}
