import type { Performance, ScheduleStatus, UserSchedule } from "@/types";

interface Props {
  performance: Performance;
  schedules: UserSchedule[];
  currentUserId: string;
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

export default function PerformanceRow({ performance, schedules, currentUserId, onClick }: Props) {
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
          <span className="text-zinc-600 text-xs ml-0.5">
            {others.length === 1 ? "going" : "going"}
          </span>
        </div>
      )}
    </button>
  );
}
