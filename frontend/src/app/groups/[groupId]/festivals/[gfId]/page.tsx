"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import PushPrompt from "@/components/PushPrompt";
import PerformanceRow from "@/components/schedule/PerformanceRow";
import StatusSheet from "@/components/schedule/StatusSheet";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useSchedule } from "@/hooks/useSchedule";
import type { Performance } from "@/types";

export default function SchedulePage({
  params,
}: {
  params: { groupId: string; gfId: string };
}) {
  return (
    <AuthGuard>
      <ScheduleContent groupId={params.groupId} gfId={params.gfId} />
    </AuthGuard>
  );
}

function groupByDay(performances: Performance[]): [string, Performance[]][] {
  const map = new Map<string, Performance[]>();
  for (const p of performances) {
    const day = p.start_time.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(p);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function formatDayHeading(dateStr: string): string {
  // noon avoids DST edge cases shifting the date
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatSyncTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function ScheduleContent({ groupId, gfId }: { groupId: string; gfId: string }) {
  const {
    festival,
    performances,
    schedules,
    isLoading,
    error,
    currentUserId,
    lastSyncedAt,
    setStatus,
    removeStatus,
  } = useSchedule(gfId);

  const { shouldPrompt, requestPermission, dismiss } = usePushNotifications();
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [selected, setSelected] = useState<Performance | null>(null);

  // Show push prompt 5 s after the schedule loads — contextually relevant moment
  useEffect(() => {
    if (!isLoading && !error && shouldPrompt) {
      const id = setTimeout(() => setShowPushPrompt(true), 5000);
      return () => clearTimeout(id);
    }
  }, [isLoading, error, shouldPrompt]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 px-4 py-8 max-w-lg mx-auto">
        <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="h-7 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-10" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !festival) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-red-400 text-sm">{error ?? "Not found"}</p>
      </div>
    );
  }

  const days = groupByDay(performances);
  const myEntry = selected
    ? (schedules.find((s) => s.performance_id === selected.id && s.user_id === currentUserId) ?? null)
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 max-w-lg mx-auto">
      <Link
        href={`/groups/${groupId}`}
        className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 text-sm mb-8 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">{festival.name}</h1>
        <p className="text-zinc-500 text-sm mt-1">{festival.location}</p>
        {lastSyncedAt && (
          <p className="text-zinc-700 text-xs mt-2">
            Synced {formatSyncTime(lastSyncedAt)}
          </p>
        )}
      </div>

      {days.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
          </div>
          <p className="text-zinc-400 text-sm">No performances scheduled yet.</p>
        </div>
      )}

      <div className="space-y-8">
        {days.map(([day, perfs]) => (
          <section key={day}>
            {/* Day heading with trailing divider line */}
            <h2 className="flex items-center gap-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              <span className="whitespace-nowrap">{formatDayHeading(day)}</span>
              <span className="flex-1 h-px bg-zinc-800" />
            </h2>
            <div className="space-y-2">
              {perfs
                .slice()
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((perf) => (
                  <PerformanceRow
                    key={perf.id}
                    performance={perf}
                    schedules={schedules}
                    currentUserId={currentUserId}
                    onClick={() => setSelected(perf)}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>

      {selected && (
        <StatusSheet
          performance={selected}
          myEntry={myEntry}
          onClose={() => setSelected(null)}
          onSetStatus={setStatus}
          onRemove={removeStatus}
        />
      )}

      {showPushPrompt && (
        <PushPrompt
          onGrant={async () => {
            await requestPermission();
            setShowPushPrompt(false);
          }}
          onDismiss={() => {
            dismiss();
            setShowPushPrompt(false);
          }}
        />
      )}
    </div>
  );
}
