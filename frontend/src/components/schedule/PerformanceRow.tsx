import type { Performance, ScheduleStatus, UserSchedule } from "@/types";

interface Props {
  performance: Performance;
  schedules: UserSchedule[];
  currentUserId: string;
  conflicts: Performance[];
  onClick: () => void;
}

// Wristband palette — friends rotate through these so each row feels like
// a row of glow sticks rather than a row of gray dots.
const MEMBER_GRADIENTS = [
  "bg-gradient-to-br from-iris-500 to-bloom-500",
  "bg-gradient-to-br from-sunset-500 to-bloom-500",
  "bg-gradient-to-br from-spark-400 to-iris-500",
  "bg-gradient-to-br from-gold-400 to-sunset-500",
  "bg-gradient-to-br from-mint-400 to-spark-400",
  "bg-gradient-to-br from-bloom-500 to-iris-500",
];

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
  attending: "bg-gradient-to-r from-iris-500 to-bloom-500 text-white border border-bloom-400/60 shadow-md shadow-iris-500/40",
  maybe: "bg-spark-500/20 text-spark-300 border border-spark-400/30",
  skipping: "bg-midnight-800 text-midnight-500 border border-midnight-700",
};

const STATUS_LEFT_BORDER: Record<ScheduleStatus, string> = {
  attending: "border-l-bloom-400",
  maybe: "border-l-spark-400",
  skipping: "border-l-midnight-700",
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
      className={`w-full text-left bg-midnight-900 border border-midnight-800 border-l-[3px] rounded-xl p-4 hover:border-iris-500/40 hover:bg-midnight-800/80 hover:shadow-md hover:shadow-iris-500/10 transition-all ${
        status ? STATUS_LEFT_BORDER[status] : "border-l-midnight-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-midnight-50 font-semibold text-[15px] leading-snug truncate">
            {performance.artist.name}
          </p>
          <p className="text-xs mt-1 flex items-center gap-1.5">
            <span className="text-spark-300 font-semibold">{performance.stage.name}</span>
            <span className="text-midnight-600">·</span>
            <span className="text-sunset-300 font-medium tabular-nums">{formatTime(performance.start_time)}–{formatTime(performance.end_time)}</span>
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
          {others.slice(0, 5).map((s, i) => (
            <div
              key={s.id}
              title={`${s.user.display_name} — ${s.status}`}
              className={`w-5 h-5 rounded-full border border-midnight-900 text-white flex items-center justify-center text-[9px] font-bold shadow-sm ${MEMBER_GRADIENTS[i % MEMBER_GRADIENTS.length]}`}
            >
              {s.user.display_name.charAt(0).toUpperCase()}
            </div>
          ))}
          {others.length > 5 && (
            <span className="text-sunset-300 text-xs ml-0.5 font-semibold">+{others.length - 5}</span>
          )}
          <span className="text-mint-300 text-xs ml-0.5 font-medium">going</span>
        </div>
      )}

      {conflicts.length > 0 && (
        <p className="flex items-center gap-1.5 mt-2.5 text-flame-400 text-xs font-medium">
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
