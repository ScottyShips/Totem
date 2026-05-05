import Link from "next/link";

import type { Group } from "@/types";

interface Props {
  group: Group;
}

export default function GroupCard({ group }: Props) {
  const memberCount = group.members.length;
  const displayMembers = group.members.slice(0, 4);
  const overflow = memberCount - 4;

  return (
    <Link
      href={`/groups/${group.id}`}
      className="block bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all group"
    >
      <h2 className="text-zinc-100 font-semibold text-base leading-snug mb-3 group-hover:text-white transition-colors">
        {group.name}
      </h2>

      <div className="flex items-center gap-2.5">
        {/* Stacked avatars */}
        <div className="flex -space-x-1.5">
          {displayMembers.map((m) => (
            <div
              key={m.id}
              title={m.user.display_name}
              className="w-6 h-6 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-300"
            >
              {m.user.display_name.charAt(0).toUpperCase()}
            </div>
          ))}
          {overflow > 0 && (
            <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-500">
              +{overflow}
            </div>
          )}
        </div>

        <span className="text-zinc-500 text-xs">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
      </div>
    </Link>
  );
}
