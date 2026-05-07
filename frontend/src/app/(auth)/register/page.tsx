"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const { user, isLoading, register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/groups";

  const [displayName, setDisplayName] = useState("");
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
      await register(email, displayName, password);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="aurora-blob bg-iris-500 w-[420px] h-[420px] -top-32 -left-24" aria-hidden="true" />
      <div className="aurora-blob bg-bloom-500 w-[360px] h-[360px] top-1/3 -right-32" aria-hidden="true" />
      <div className="aurora-blob bg-spark-500 w-[320px] h-[320px] -bottom-24 left-1/4 opacity-30" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <h1 className="aurora-text text-7xl font-black tracking-tight leading-none">
              Totem
            </h1>
            <div
              className="absolute inset-0 blur-2xl opacity-40 -z-10"
              style={{
                background: "linear-gradient(120deg, #a78bfa, #f472b6, #38bdf8)",
              }}
              aria-hidden="true"
            />
          </div>
          <p className="text-midnight-300 text-sm mt-4 font-medium tracking-wide">
            Find your people.
          </p>
        </div>

        <div className="bg-midnight-900/60 backdrop-blur-xl border border-midnight-700/50 rounded-2xl p-6 shadow-2xl shadow-iris-950/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="display-name" className="block text-xs font-semibold text-midnight-300 mb-2 uppercase tracking-wider">
                Display name
              </label>
              <input
                id="display-name"
                type="text"
                required
                autoComplete="name"
                maxLength={100}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-midnight-950/60 border border-midnight-700 text-midnight-100 rounded-lg px-3.5 py-2.5 text-sm placeholder:text-midnight-500 focus:outline-none focus:ring-2 focus:ring-iris-400 focus:border-transparent transition-all"
                placeholder="Forest Fam"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-midnight-300 mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-midnight-950/60 border border-midnight-700 text-midnight-100 rounded-lg px-3.5 py-2.5 text-sm placeholder:text-midnight-500 focus:outline-none focus:ring-2 focus:ring-iris-400 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-midnight-300 mb-2 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-midnight-950/60 border border-midnight-700 text-midnight-100 rounded-lg px-3.5 py-2.5 text-sm placeholder:text-midnight-500 focus:outline-none focus:ring-2 focus:ring-iris-400 focus:border-transparent transition-all"
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <p className="text-flame-300 text-sm bg-flame-500/10 border border-flame-400/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-iris-500 via-bloom-500 to-iris-500 bg-[length:200%_100%] bg-left hover:bg-right disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 text-sm transition-[background-position] duration-700 shadow-lg shadow-iris-600/30"
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-sm text-midnight-400">
          Already have an account?{" "}
          <Link href="/login" className="text-iris-300 hover:text-bloom-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
