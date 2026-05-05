"use client";

import { useState } from "react";

interface Props {
  onGrant: () => Promise<void>;
  onDismiss: () => void;
}

export default function PushPrompt({ onGrant, onDismiss }: Props) {
  const [loading, setLoading] = useState(false);

  const handleGrant = async () => {
    setLoading(true);
    try {
      await onGrant();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-6 sm:pb-8 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 max-w-lg mx-auto shadow-2xl shadow-black/50">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-100 font-semibold text-sm">Stay in the loop</p>
            <p className="text-zinc-400 text-sm mt-0.5 leading-snug">
              Get notified when friends update their festival plans.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={handleGrant}
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm rounded-lg px-4 py-1.5 transition-colors"
              >
                {loading ? "…" : "Sure"}
              </button>
              <button
                onClick={onDismiss}
                className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
