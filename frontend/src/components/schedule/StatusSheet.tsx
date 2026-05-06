"use client";

import { useState } from "react";

import { ApiError } from "@/lib/api";
import type { Performance, ScheduleStatus, UserSchedule } from "@/types";

interface Props {
  performance: Performance;
  myEntry: UserSchedule | null;
  conflicts: Performance[];
  onClose: () => void;
  onSetStatus: (performanceId: string, status: ScheduleStatus) => Promise<void>;
  onRemove: (performanceId: string) => Promise<void>;
}

function formatTimeRange(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };
  return `${new Date(startIso).toLocaleTimeString("en-US", opts)}–${new Date(endIso).toLocaleTimeString("en-US", opts)}`;
}

const STATUSES: { value: ScheduleStatus; label: string; description: string }[] = [
  { value: "attending", label: "Going", description: "You'll be there" },
  { value: "maybe", label: "Maybe", description: "On the fence" },
  { value: "skipping", label: "Skipping", description: "Sitting this one out" },
];

export default function StatusSheet({ performance, myEntry, conflicts, onClose, onSetStatus, onRemove }: Props) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSelect = async (status: ScheduleStatus) => {
    setError("");
    setSubmitting(status);
    try {
      await onSetStatus(performance.id, status);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setSubmitting(null);
    }
  };

  const handleRemove = async () => {
    setError("");
    setSubmitting("remove");
    try {
      await onRemove(performance.id);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setSubmitting(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl px-4 pb-8 pt-5 w-full max-w-lg">
        <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-4" />

        <p className="text-zinc-100 font-semibold text-base mb-0.5">{performance.artist.name}</p>
        <p className="text-zinc-500 text-sm mb-5">{performance.stage.name}</p>

        {conflicts.length > 0 && (
          <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3">
            <p className="flex items-center gap-1.5 text-rose-400 text-sm font-semibold mb-1.5">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              Time conflict
            </p>
            <ul className="space-y-0.5">
              {conflicts.map((c) => (
                <li key={c.id} className="text-rose-300/90 text-xs">
                  {c.artist.name}{" "}
                  <span className="text-rose-300/60">
                    · {formatTimeRange(c.start_time, c.end_time)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {STATUSES.map(({ value, label, description }) => {
            const isActive = myEntry?.status === value;
            return (
              <button
                key={value}
                onClick={() => handleSelect(value)}
                disabled={submitting !== null}
                className={`w-full flex items-center justify-between rounded-xl px-4 py-3 border transition-colors disabled:opacity-50 ${
                  isActive
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                <span className="font-medium text-sm">{label}</span>
                <span className={`text-xs ${isActive ? "text-amber-500/70" : "text-zinc-500"}`}>
                  {description}
                </span>
              </button>
            );
          })}
        </div>

        {myEntry && (
          <button
            onClick={handleRemove}
            disabled={submitting !== null}
            className="w-full text-sm text-zinc-500 hover:text-red-400 py-2 transition-colors disabled:opacity-50"
          >
            {submitting === "remove" ? "Removing…" : "Remove from plan"}
          </button>
        )}

        {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
      </div>
    </div>
  );
}
