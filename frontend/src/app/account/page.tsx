"use client";

import Link from "next/link";
import { useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";

export default function AccountPage() {
  return (
    <AuthGuard>
      <AccountContent />
    </AuthGuard>
  );
}

function AccountContent() {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  if (!user) return null;

  const trimmed = displayName.trim();
  const dirty = trimmed.length > 0 && trimmed !== user.display_name;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await updateProfile({ display_name: trimmed });
      setMessage({ type: "ok", text: "Saved" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof ApiError ? err.message : "Failed to save",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 text-midnight-500 hover:text-midnight-200 text-sm mb-8 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        My Groups
      </Link>

      <h1 className="text-2xl font-bold text-midnight-100 mb-8">Account</h1>

      <div className="flex items-center gap-4 mb-10">
        <Avatar name={user.display_name} size="lg" />
        <div className="min-w-0">
          <p className="text-midnight-100 font-semibold text-base truncate">{user.display_name}</p>
          <p className="text-midnight-500 text-sm truncate">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label htmlFor="display-name" className="block text-sm font-medium text-midnight-300 mb-1.5">
            Display name
          </label>
          <input
            id="display-name"
            type="text"
            required
            maxLength={100}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-midnight-900 border border-midnight-800 text-midnight-100 rounded-lg px-3 py-2.5 text-sm placeholder:text-midnight-600 focus:outline-none focus:ring-2 focus:ring-iris-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-midnight-300 mb-1.5">Email</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full bg-midnight-900 border border-midnight-800 text-midnight-500 rounded-lg px-3 py-2.5 text-sm cursor-not-allowed"
          />
          <p className="text-midnight-600 text-xs mt-1.5">Email changes aren&apos;t supported yet.</p>
        </div>

        {message && (
          <p
            className={`text-sm rounded-lg px-3 py-2 ${
              message.type === "ok"
                ? "text-mint-400 bg-mint-400/10 border border-mint-400/20"
                : "text-flame-400 bg-flame-400/10 border border-flame-400/20"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !dirty}
          className="w-full bg-iris-500 hover:bg-iris-400 disabled:opacity-50 disabled:cursor-not-allowed text-midnight-950 font-bold text-sm rounded-xl py-3 transition-colors"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
