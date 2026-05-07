import Link from "next/link";

import type { Group } from "@/types";

interface Props {
  group: Group;
}

// Festival wristband palette — rotated through avatars so a group's members
// each get a distinct hue rather than every circle being the same gray.
const MEMBER_GRADIENTS = [
  "bg-gradient-to-br from-iris-500 to-bloom-500",
  "bg-gradient-to-br from-sunset-500 to-bloom-500",
  "bg-gradient-to-br from-spark-400 to-iris-500",
  "bg-gradient-to-br from-gold-400 to-sunset-500",
  "bg-gradient-to-br from-mint-400 to-spark-400",
  "bg-gradient-to-br from-bloom-500 to-iris-500",
];

export default function GroupCard({ group }: Props) {
  const memberCount = group.members.length;
  const displayMembers = group.members.slice(0, 4);
  const overflow = memberCount - 4;

  return (
    <Link
      href={`/groups/${group.id}`}
      className="relative block bg-midnight-900 border border-midnight-800 rounded-xl p-4 hover:border-iris-500/40 hover:bg-midnight-900/80 transition-all group overflow-hidden"
    >
      {/* Subtle gradient sheen on hover */}
      <div
        className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(244,114,182,0.04) 50%, transparent 100%)",
        }}
        aria-hidden="true"
      />
      <h2 className="relative text-midnight-100 font-semibold text-base leading-snug mb-3 group-hover:text-white transition-colors">
        {group.name}
      </h2>

      <div className="relative flex items-center gap-2.5">
        {/* Stacked avatars — each member gets a unique gradient hue based on
            their first letter so a group has visual variety like flags or
            wristbands at a festival. */}
        <div className="flex -space-x-1.5">
          {displayMembers.map((m, i) => (
            <div
              key={m.id}
              title={m.user.display_name}
              className={`w-7 h-7 rounded-full border-2 border-midnight-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${MEMBER_GRADIENTS[i % MEMBER_GRADIENTS.length]}`}
            >
              {m.user.display_name.charAt(0).toUpperCase()}
            </div>
          ))}
          {overflow > 0 && (
            <div className="w-7 h-7 rounded-full bg-midnight-800 border-2 border-midnight-900 flex items-center justify-center text-[10px] font-bold text-sunset-300">
              +{overflow}
            </div>
          )}
        </div>

        <span className="text-mint-300 text-xs font-semibold">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
      </div>
    </Link>
  );
}
