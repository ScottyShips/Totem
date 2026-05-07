"use client";

import { useState } from "react";

import AuthGuard from "@/components/AuthGuard";
import GroupCard from "@/components/groups/GroupCard";
import { useGroups } from "@/hooks/useGroups";
import { ApiError } from "@/lib/api";

export default function GroupsPage() {
  return (
    <AuthGuard>
      <GroupsContent />
    </AuthGuard>
  );
}

function GroupsContent() {
  const { groups, isLoading, error, createGroup } = useGroups();
  const [modalOpen, setModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [createError, setCreateError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openModal = () => {
    setGroupName("");
    setCreateError("");
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setSubmitting(true);
    try {
      await createGroup(groupName.trim());
      closeModal();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="aurora-blob bg-iris-500 w-[420px] h-[420px] -top-32 -right-24 opacity-25" aria-hidden="true" />
      <div className="aurora-blob bg-bloom-500 w-[300px] h-[300px] top-2/3 -left-24 opacity-20" aria-hidden="true" />
      <div className="aurora-blob bg-sunset-500 w-[380px] h-[380px] -bottom-32 right-0 opacity-25" aria-hidden="true" />
      <div className="aurora-blob bg-gold-400 w-[200px] h-[200px] top-1/3 right-1/4 opacity-10" aria-hidden="true" />

      <div className="relative px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight aurora-text inline-block">My Groups</h1>
          <p className="text-sunset-300/90 text-sm mt-1 font-medium">Coordinate with your crew</p>
        </div>
        <button
          onClick={openModal}
          className="bg-gradient-to-r from-iris-500 to-bloom-500 hover:from-iris-400 hover:to-bloom-400 text-white font-semibold text-sm rounded-xl px-4 py-2.5 transition-all flex items-center gap-1.5 shadow-lg shadow-iris-600/30"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New group
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-midnight-900 border border-midnight-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center py-16">
          <p className="text-flame-400 text-sm">{error}</p>
        </div>
      )}

      {!isLoading && !error && groups.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-iris-500/30 via-bloom-500/30 to-sunset-500/30 border border-bloom-400/30 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-bloom-500/20">
            <svg className="w-7 h-7 text-bloom-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="text-midnight-50 font-bold mb-1.5">No groups yet</p>
          <p className="text-midnight-300 text-sm leading-relaxed max-w-[220px] mx-auto">
            Create one to start coordinating with your crew.
          </p>
        </div>
      )}

      {!isLoading && !error && groups.length > 0 && (
        <ul className="space-y-3">
          {groups.map((group) => (
            <li key={group.id}>
              <GroupCard group={group} />
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 px-4 pb-8 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-midnight-900 border border-midnight-800 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-midnight-100 font-bold text-lg mb-1">Create group</h2>
            <p className="text-midnight-500 text-sm mb-5">Give your crew a name.</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="group-name" className="block text-sm font-medium text-midnight-300 mb-1.5">
                  Group name
                </label>
                <input
                  id="group-name"
                  type="text"
                  required
                  autoFocus
                  maxLength={100}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-midnight-800 border border-midnight-700 text-midnight-100 rounded-lg px-3 py-2.5 text-sm placeholder:text-midnight-600 focus:outline-none focus:ring-2 focus:ring-iris-500 focus:border-transparent"
                  placeholder="Electric Forest Fam"
                />
              </div>

              {createError && (
                <p className="text-flame-400 text-sm bg-flame-400/10 border border-flame-400/20 rounded-lg px-3 py-2">
                  {createError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-midnight-800 hover:bg-midnight-700 text-midnight-300 font-medium text-sm rounded-xl py-2.5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || groupName.trim().length === 0}
                  className="flex-1 bg-gradient-to-r from-iris-500 to-bloom-500 hover:from-iris-400 hover:to-bloom-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl py-2.5 transition-all shadow-lg shadow-iris-600/30"
                >
                  {submitting ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
