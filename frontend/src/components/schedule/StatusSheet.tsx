"use client";

import { useState } from "react";

import SpotifyEmbed from "@/components/schedule/SpotifyEmbed";
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

function formatTimeRange(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return "Time TBD";
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };
  return `${new Date(startIso).toLocaleTimeString("en-US", opts)}–${new Date(endIso).toLocaleTimeString("en-US", opts)}`;
}

// Each status has its own color identity so users distinguish by hue,
// not just by reading text (helps low-vision and color-coded scanning).
// Icons add a second redundant cue for screen readers and accessibility.
type StatusOption = {
  value: ScheduleStatus;
  label: string;
  description: string;
  // Inactive state — dark high-contrast surface with a colored side border
  // and matching icon. Bright text on near-black bg = strong WCAG contrast.
  inactiveBorder: string;
  inactiveIconBg: string;
  inactiveIconColor: string;
  // Active state — full-bleed gradient that sits well above the cotton-candy
  // backdrop. White text on saturated gradient = highest contrast in the app.
  activeBg: string;
  iconPath: string;
};

const CHECK_PATH = "M4.5 12.75l6 6 9-13.5";
const QUESTION_PATH =
  "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z";
const SKIP_PATH = "M6 18L18 6M6 6l12 12";

const STATUSES: StatusOption[] = [
  {
    value: "attending",
    label: "Going",
    description: "You'll be there",
    inactiveBorder: "border-l-bloom-400",
    inactiveIconBg: "bg-bloom-500/20",
    inactiveIconColor: "text-bloom-300",
    activeBg: "from-iris-500 to-bloom-500",
    iconPath: CHECK_PATH,
  },
  {
    value: "maybe",
    label: "Maybe",
    description: "On the fence",
    inactiveBorder: "border-l-spark-400",
    inactiveIconBg: "bg-spark-500/20",
    inactiveIconColor: "text-spark-300",
    activeBg: "from-spark-500 to-iris-500",
    iconPath: QUESTION_PATH,
  },
  {
    value: "skipping",
    label: "Skipping",
    description: "Sitting this one out",
    inactiveBorder: "border-l-midnight-500",
    inactiveIconBg: "bg-midnight-700/60",
    inactiveIconColor: "text-midnight-300",
    activeBg: "from-midnight-700 to-midnight-600",
    iconPath: SKIP_PATH,
  },
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
      className="fixed inset-0 bg-midnight-950/80 backdrop-blur-md flex items-end justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Cotton candy gradient ring wraps the sheet — same wristband treatment
          as the PushPrompt. The ring is only visible on the top and side edges
          since the sheet is anchored to the bottom of the viewport. */}
      <div
        className="relative w-full max-w-lg rounded-t-3xl p-[1.5px] shadow-2xl shadow-bloom-500/40"
        style={{
          background:
            "linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #fb923c 100%)",
        }}
      >
        <div className="relative bg-midnight-900 rounded-t-[22px] px-4 pb-8 pt-5 overflow-hidden">
          {/* Warm pink corner glow + cool iris glow on the opposite side
              for that dusk-light feeling inside the sheet */}
          <div
            className="absolute -top-20 -right-16 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none"
            style={{ background: "radial-gradient(circle, #f472b6 0%, transparent 70%)" }}
            aria-hidden="true"
          />
          <div
            className="absolute -top-12 -left-16 w-56 h-56 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }}
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-16 right-1/4 w-56 h-56 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ background: "radial-gradient(circle, #fb923c 0%, transparent 70%)" }}
            aria-hidden="true"
          />
        <div className="relative">
          <div className="w-10 h-1 rounded-full bg-midnight-600 mx-auto mb-4" />

          <p className="text-midnight-50 font-bold text-lg mb-0.5">{performance.artist.name}</p>
          <p className="text-spark-300 text-sm mb-5 font-medium">{performance.stage.name}</p>

        <SpotifyEmbed artist={performance.artist} />

        {conflicts.length > 0 && (
          <div className="mb-4 rounded-xl bg-flame-500/10 border border-flame-500/20 px-4 py-3">
            <p className="flex items-center gap-1.5 text-flame-400 text-sm font-semibold mb-1.5">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              Time conflict
            </p>
            <ul className="space-y-0.5">
              {conflicts.map((c) => (
                <li key={c.id} className="text-flame-300/90 text-xs">
                  {c.artist.name}{" "}
                  <span className="text-flame-300/60">
                    · {formatTimeRange(c.start_time, c.end_time)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {STATUSES.map((option) => {
            const isActive = myEntry?.status === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                disabled={submitting !== null}
                aria-pressed={isActive}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border-l-4 border-y border-r transition-all disabled:opacity-50 ${
                  isActive
                    ? `bg-gradient-to-r ${option.activeBg} border-transparent text-white shadow-lg shadow-iris-600/40 ring-2 ring-white/20`
                    : `bg-midnight-950 ${option.inactiveBorder} border-y-midnight-700 border-r-midnight-700 hover:bg-midnight-900 hover:border-y-midnight-600 hover:border-r-midnight-600`
                }`}
              >
                {/* Status icon — solid filled circle in the status hue, gives a
                    second visual cue beyond the label so users can scan by
                    color/shape rather than reading every option. */}
                <span
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                    isActive ? "bg-white/25" : option.inactiveIconBg
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    className={`w-5 h-5 ${isActive ? "text-white" : option.inactiveIconColor}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={option.iconPath} />
                  </svg>
                </span>
                <div className="flex-1 text-left">
                  <p className={`font-bold text-base leading-tight ${isActive ? "text-white" : "text-midnight-50"}`}>
                    {option.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${isActive ? "text-white/85" : "text-midnight-200"}`}>
                    {option.description}
                  </p>
                </div>
                {isActive && (
                  <svg
                    className="w-5 h-5 text-white flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={CHECK_PATH} />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {myEntry && (
          <button
            onClick={handleRemove}
            disabled={submitting !== null}
            className="w-full text-sm text-midnight-500 hover:text-flame-400 py-2 transition-colors disabled:opacity-50"
          >
            {submitting === "remove" ? "Removing…" : "Remove from plan"}
          </button>
        )}

          {error && <p className="text-flame-400 text-sm text-center mt-2">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
