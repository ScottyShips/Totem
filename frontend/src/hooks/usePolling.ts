"use client";

import { useEffect } from "react";

export function usePolling(callback: () => Promise<void>, intervalMs: number) {
  useEffect(() => {
    const id = setInterval(() => {
      callback().catch(() => {});
    }, intervalMs);
    return () => clearInterval(id);
  }, [callback, intervalMs]);
}
