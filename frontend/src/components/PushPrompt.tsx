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
    <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-6 sm:pb-8 pointer-events-none">
      <div
        className="relative pointer-events-auto max-w-lg mx-auto rounded-2xl p-[1.5px] shadow-2xl shadow-bloom-500/30"
        style={{
          background: "linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #fb923c 100%)",
        }}
      >
        {/* Inner solid card — sits inside the gradient ring like a wristband */}
        <div className="relative bg-midnight-900 rounded-[14px] p-5 overflow-hidden">
          {/* Soft warm glow blob in the corner so the card has visible color
              even before reading the content. */}
          <div
            className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-50 pointer-events-none"
            style={{ background: "radial-gradient(circle, #f472b6 0%, transparent 70%)" }}
            aria-hidden="true"
          />
          <div className="relative flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-bloom-500 to-sunset-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-bloom-500/40">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-midnight-50 font-bold text-base">Stay in the loop</p>
              <p className="text-midnight-200 text-sm mt-0.5 leading-snug">
                Get notified when friends update their festival plans.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handleGrant}
                  disabled={loading}
                  className="bg-gradient-to-r from-iris-500 to-bloom-500 hover:from-iris-400 hover:to-bloom-400 disabled:opacity-50 text-white font-semibold text-sm rounded-lg px-4 py-1.5 transition-all shadow-md shadow-iris-500/40"
                >
                  {loading ? "…" : "Turn on"}
                </button>
                <button
                  onClick={onDismiss}
                  className="text-midnight-300 hover:text-midnight-100 text-sm font-medium transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
