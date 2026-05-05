"use client";

import { useEffect, useState } from "react";

import { ApiError, apiFetch } from "@/lib/api";
import type { Festival, FestivalList } from "@/types";

interface Props {
  linkedFestivalIds: string[];
  onClose: () => void;
  onLink: (festivalId: string) => Promise<void>;
}

export default function FestivalPicker({ linkedFestivalIds, onClose, onLink }: Props) {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<FestivalList>("/api/v1/festivals")
      .then((res) => setFestivals(res.data))
      .catch(() => setError("Failed to load festivals"))
      .finally(() => setIsLoading(false));
  }, []);

  const available = festivals.filter((f) => !linkedFestivalIds.includes(f.id));

  const handlePick = async (festivalId: string) => {
    setError("");
    setSubmitting(festivalId);
    try {
      await onLink(festivalId);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to link festival");
      setSubmitting(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-4 pb-8 sm:pb-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-sm">
        <h2 className="text-zinc-100 font-semibold text-lg mb-4">Add festival</h2>

        {isLoading && (
          <p className="text-zinc-500 text-sm text-center py-4">Loading…</p>
        )}

        {!isLoading && error && (
          <p className="text-red-400 text-sm mb-3">{error}</p>
        )}

        {!isLoading && !error && available.length === 0 && (
          <p className="text-zinc-400 text-sm text-center py-4">
            All available festivals are already linked.
          </p>
        )}

        {!isLoading && available.length > 0 && (
          <ul className="space-y-2 mb-4">
            {available.map((festival) => (
              <li key={festival.id}>
                <button
                  onClick={() => handlePick(festival.id)}
                  disabled={submitting !== null}
                  className="w-full text-left bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-4 py-3 transition-colors disabled:opacity-50"
                >
                  <p className="text-zinc-100 font-medium text-sm">{festival.name}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {festival.location} · {new Date(festival.start_date).getFullYear()}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onClose}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm rounded-lg py-2.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
