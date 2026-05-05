"use client";

import Link from "next/link";
import { useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import FestivalPicker from "@/components/groups/FestivalPicker";
import InviteModal from "@/components/groups/InviteModal";
import MemberList from "@/components/groups/MemberList";
import { useAuth } from "@/hooks/useAuth";
import { useGroup } from "@/hooks/useGroup";

export default function GroupDetailPage({ params }: { params: { groupId: string } }) {
  return (
    <AuthGuard>
      <GroupDetailContent groupId={params.groupId} />
    </AuthGuard>
  );
}

function GroupDetailContent({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const { group, festivals, isLoading, error, sendInvitation, linkFestival } = useGroup(groupId);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 px-4 py-8 max-w-lg mx-auto">
        <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse mb-8" />
        <div className="h-7 w-40 bg-zinc-800 rounded animate-pulse mb-10" />
        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-3" />
        <div className="h-28 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse mb-8" />
        <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse mb-3" />
        <div className="h-20 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-red-400 text-sm">{error ?? "Group not found"}</p>
      </div>
    );
  }

  const linkedFestivalIds = festivals.map((gf) => gf.festival_id);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 max-w-lg mx-auto">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 text-sm mb-8 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        My Groups
      </Link>

      <h1 className="text-2xl font-bold text-zinc-100 mb-8">{group.name}</h1>

      {/* Members */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Members · {group.members.length}
          </h2>
          <button
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Invite
          </button>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <MemberList members={group.members} currentUserId={user?.id ?? ""} />
        </div>
      </section>

      {/* Festivals */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Festivals
          </h2>
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add
          </button>
        </div>

        {festivals.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            </div>
            <p className="text-zinc-400 text-sm font-medium mb-1">No festivals linked yet</p>
            <p className="text-zinc-600 text-xs">Add one to start planning your schedule.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {festivals.map((gf) => (
              <li key={gf.id}>
                <Link
                  href={`/groups/${groupId}/festivals/${gf.id}`}
                  className="block bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-zinc-100 font-semibold text-base leading-snug group-hover:text-white transition-colors">
                        {gf.festival.name}
                      </h3>
                      <p className="text-zinc-500 text-sm mt-0.5">
                        {gf.festival.location} · {new Date(gf.festival.start_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}–{new Date(gf.festival.end_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {inviteOpen && (
        <InviteModal onClose={() => setInviteOpen(false)} onSend={sendInvitation} />
      )}

      {pickerOpen && (
        <FestivalPicker
          linkedFestivalIds={linkedFestivalIds}
          onClose={() => setPickerOpen(false)}
          onLink={linkFestival}
        />
      )}
    </div>
  );
}
