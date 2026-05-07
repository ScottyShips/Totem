"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-midnight-500 text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
