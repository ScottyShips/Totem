"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/groups";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace(redirect);
  }, [user, isLoading, router, redirect]);

  if (isLoading || user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-x-0 top-0 h-80 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(251,146,60,0.12) 0%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Wordmark */}
        <div className="text-center mb-10">
          <h1
            className="text-5xl font-black tracking-tight mb-2"
            style={{
              background: "linear-gradient(180deg, #fcd34d 0%, #d97706 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Totem
          </h1>
          <p className="text-zinc-500 text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-lg py-3 text-sm transition-colors"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
