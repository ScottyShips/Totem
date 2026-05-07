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
      <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
        <div className="h-4 w-16 bg-midnight-800 rounded animate-pulse mb-8" />
        <div className="h-7 w-40 bg-midnight-800 rounded animate-pulse mb-10" />
        <div className="h-4 w-24 bg-midnight-800 rounded animate-pulse mb-3" />
        <div className="h-28 bg-midnight-900 border border-midnight-800 rounded-xl animate-pulse mb-8" />
        <div className="h-4 w-20 bg-midnight-800 rounded animate-pulse mb-3" />
        <div className="h-20 bg-midnight-900 border border-midnight-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-flame-400 text-sm">{error ?? "Group not found"}</p>
      </div>
    );
  }

  const linkedFestivalIds = festivals.map((gf) => gf.festival_id);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="aurora-blob bg-iris-500 w-[420px] h-[420px] -top-32 -right-24 opacity-25" aria-hidden="true" />
      <div className="aurora-blob bg-sunset-500 w-[360px] h-[360px] -bottom-24 -left-24 opacity-25" aria-hidden="true" />
      <div className="aurora-blob bg-bloom-500 w-[260px] h-[260px] top-1/2 right-0 opacity-15" aria-hidden="true" />

      <div className="relative px-4 py-8 max-w-lg mx-auto">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 text-midnight-400 hover:text-iris-300 text-sm mb-8 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        My Groups
      </Link>

      <h1 className="text-3xl font-black tracking-tight aurora-text inline-block mb-8">{group.name}</h1>

      {/* Members */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <span className="text-iris-300">Members</span>
            <span className="text-mint-300">· {group.members.length}</span>
          </h2>
          <button
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-bold bg-gradient-to-r from-iris-500/20 to-bloom-500/20 hover:from-iris-500/30 hover:to-bloom-500/30 text-bloom-200 border border-bloom-400/30 rounded-lg px-2.5 py-1 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Invite
          </button>
        </div>
        <div className="bg-midnight-900/80 backdrop-blur-sm border border-midnight-800 rounded-xl p-4">
          <MemberList members={group.members} currentUserId={user?.id ?? ""} />
        </div>
      </section>

      {/* Festivals */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-sunset-300">
            Festivals
          </h2>
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-bold bg-gradient-to-r from-sunset-500/20 to-gold-400/20 hover:from-sunset-500/30 hover:to-gold-400/30 text-sunset-200 border border-sunset-400/30 rounded-lg px-2.5 py-1 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add
          </button>
        </div>

        {festivals.length === 0 ? (
          <div className="bg-midnight-900/80 backdrop-blur-sm border border-midnight-800 rounded-xl p-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sunset-500/30 to-bloom-500/30 border border-sunset-400/30 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-sunset-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            </div>
            <p className="text-midnight-100 text-sm font-semibold mb-1">No festivals linked yet</p>
            <p className="text-midnight-400 text-xs">Add one to start planning your schedule.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {festivals.map((gf) => (
              <li key={gf.id}>
                <Link
                  href={`/groups/${groupId}/festivals/${gf.id}`}
                  className="relative block bg-midnight-900/80 backdrop-blur-sm border border-midnight-800 rounded-xl p-4 hover:border-sunset-400/40 hover:bg-midnight-800/80 transition-all group overflow-hidden"
                >
                  <div
                    className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(251,146,60,0.08) 0%, rgba(244,114,182,0.04) 100%)",
                    }}
                    aria-hidden="true"
                  />
                  <div className="relative flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-midnight-50 font-bold text-base leading-snug">
                        {gf.festival.name}
                      </h3>
                      <p className="text-xs mt-1">
                        <span className="text-spark-300 font-medium">{gf.festival.location}</span>
                        <span className="text-midnight-500"> · </span>
                        <span className="text-sunset-300 font-medium">
                          {new Date(gf.festival.start_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}–{new Date(gf.festival.end_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-iris-400 group-hover:text-bloom-300 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>

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
