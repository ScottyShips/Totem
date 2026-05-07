import Avatar from "@/components/ui/Avatar";
import type { GroupMember } from "@/types";

interface Props {
  members: GroupMember[];
  currentUserId: string;
}

export default function MemberList({ members, currentUserId }: Props) {
  return (
    <ul className="space-y-2">
      {members.map((member) => (
        <li key={member.id} className="flex items-center gap-3 py-1">
          <Avatar name={member.user.display_name} size="sm" />
          <span className="text-midnight-50 text-sm flex-1 leading-snug font-medium">
            {member.user.display_name}
            {member.user_id === currentUserId && (
              <span className="text-spark-300 ml-1.5 text-xs font-semibold">you</span>
            )}
          </span>
          {member.role === "admin" && (
            <span className="text-[10px] uppercase tracking-wider font-bold bg-gradient-to-r from-gold-400 to-sunset-500 text-midnight-950 px-2 py-0.5 rounded-full">
              admin
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
