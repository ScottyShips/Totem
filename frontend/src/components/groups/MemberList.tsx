import type { GroupMember } from "@/types";

interface Props {
  members: GroupMember[];
  currentUserId: string;
}

function AvatarInitial({ name }: { name: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function MemberList({ members, currentUserId }: Props) {
  return (
    <ul className="space-y-2">
      {members.map((member) => (
        <li key={member.id} className="flex items-center gap-3 py-1">
          <AvatarInitial name={member.user.display_name} />
          <span className="text-zinc-100 text-sm flex-1 leading-snug">
            {member.user.display_name}
            {member.user_id === currentUserId && (
              <span className="text-zinc-500 ml-1">(you)</span>
            )}
          </span>
          {member.role === "admin" && (
            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">
              admin
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
