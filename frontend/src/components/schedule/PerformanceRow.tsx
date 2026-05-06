import type { Performance, ScheduleStatus, UserSchedule } from "@/types";

interface Props {
  performance: Performance;
  schedules: UserSchedule[];
  currentUserId: string;
  conflicts: Performance[];
  onClick: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  attending: "Going",
  maybe: "Maybe",
  skipping: "Skip",
};

const STATUS_CHIP: Record<ScheduleStatus, string> = {
  attending: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  maybe: "bg-zinc-700/60 text-zinc-300 border border-zinc-600",
  skipping: "bg-zinc-800/60 text-zinc-500 border border-zinc-700",
};

const STATUS_LEFT_BORDER: Record<ScheduleStatus, string> = {
  attending: "border-l-amber-500",
  maybe: "border-l-zinc-500",
  skipping: "border-l-zinc-800",
};

export default function PerformanceRow({ performance, schedules, currentUserId, conflicts, onClick }: Props) {
  const myEntry = schedules.find(
    (s) => s.performance_id === performance.id && s.user_id === currentUserId,
  );
  const others = schedules.filter(
    (s) =>
      s.performance_id === performance.id &&
      s.user_id !== currentUserId &&
      s.status !== "skipping",
  );
  const status = myEntry?.status as ScheduleStatus | undefined;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-zinc-900 border border-zinc-800 border-l-2 rounded-xl p-4 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all ${
        status ? STATUS_LEFT_BORDER[status] : "border-l-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-zinc-100 font-semibold text-[15px] leading-snug truncate">
            {performance.artist.name}
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">
            {performance.stage.name} · {formatTime(performance.start_time)}–{formatTime(performance.end_time)}
          </p>
        </div>

        {status && (
          <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CHIP[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      {others.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3">
          {others.slice(0, 5).map((s) => (
            <div
              key={s.id}
              title={`${s.user.display_name} — ${s.status}`}
              className="w-5 h-5 rounded-full bg-zinc-700 border border-zinc-600 text-zinc-300 flex items-center justify-center text-[9px] font-bold"
            >
              {s.user.display_name.charAt(0).toUpperCase()}
            </div>
          ))}
          {others.length > 5 && (
            <span className="text-zinc-600 text-xs ml-0.5">+{others.length - 5}</span>
          )}
          <span className="text-zinc-600 text-xs ml-0.5">going</span>
        </div>
      )}

      {conflicts.length > 0 && (
        <p className="flex items-center gap-1.5 mt-2.5 text-rose-400 text-xs font-medium">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span className="truncate">
            Conflicts with {conflicts[0].artist.name}
            {conflicts.length > 1 && ` +${conflicts.length - 1} more`}
          </span>
        </p>
      )}
    </button>
  );
}
