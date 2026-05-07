"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { ApiError, apiFetch } from "@/lib/api";
import type { Invitation, InvitationAcceptResponse } from "@/types";

export default function InvitePage({ params }: { params: { token: string } }) {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const { token } = params;

  const [invite, setInvite] = useState<Invitation | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    apiFetch<Invitation>(`/api/v1/invitations/${token}`)
      .then(setInvite)
      .catch((err) => {
        if (err instanceof ApiError) {
          if (err.status === 410) setLoadError("This invitation has expired.");
          else if (err.status === 409) setLoadError("This invitation has already been used.");
          else if (err.status === 404) setLoadError("Invitation not found.");
          else setLoadError(err.message);
        } else {
          setLoadError("Something went wrong. Please try again.");
        }
      })
      .finally(() => setIsLoadingInvite(false));
  }, [token]);

  const handleJoin = async () => {
    if (!invite) return;
    setJoinError("");
    setIsJoining(true);
    try {
      const result = await apiFetch<InvitationAcceptResponse>(
        `/api/v1/invitations/${token}/accept`,
        { method: "POST" },
      );
      router.push(`/groups/${result.group_id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Already a member of this group — navigate there gracefully
        router.push(`/groups/${invite.group_id}`);
        return;
      }
      setJoinError(err instanceof ApiError ? err.message : "Something went wrong");
      setIsJoining(false);
    }
  };

  if (isLoadingInvite || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-midnight-500 text-sm">Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-midnight-100 mb-2">Invitation unavailable</h1>
        <p className="text-midnight-400 text-sm mb-8">{loadError}</p>
        <Link
          href="/groups"
          className="bg-iris-500 hover:bg-iris-400 text-midnight-950 font-semibold text-sm rounded-lg px-6 py-2.5 transition-colors"
        >
          Go to Totem
        </Link>
      </div>
    );
  }

  const redirectParam = encodeURIComponent(`/invite/${token}`);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <p className="text-midnight-500 text-sm mb-2">You&apos;ve been invited to join</p>
        <h1 className="text-3xl font-bold text-midnight-100 mb-8">{invite!.group.name}</h1>

        {user ? (
          <>
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full bg-iris-500 hover:bg-iris-400 disabled:opacity-50 disabled:cursor-not-allowed text-midnight-950 font-semibold rounded-lg py-3 text-sm transition-colors"
            >
              {isJoining ? "Joining…" : "Join group"}
            </button>

            {joinError && <p className="text-flame-400 text-sm mt-3">{joinError}</p>}

            <p className="text-midnight-600 text-xs mt-5">
              Signed in as {user.display_name}.{" "}
              <button
                onClick={logout}
                className="text-midnight-400 hover:text-midnight-200 underline underline-offset-2 transition-colors"
              >
                Not you?
              </button>
            </p>
          </>
        ) : (
          <>
            <p className="text-midnight-400 text-sm mb-6">
              Sign in or create an account to join.
            </p>
            <div className="space-y-3">
              <Link
                href={`/login?redirect=${redirectParam}`}
                className="block w-full bg-iris-500 hover:bg-iris-400 text-midnight-950 font-semibold rounded-lg py-3 text-sm transition-colors"
              >
                Sign in
              </Link>
              <Link
                href={`/register?redirect=${redirectParam}`}
                className="block w-full bg-midnight-800 hover:bg-midnight-700 text-midnight-300 font-medium rounded-lg py-3 text-sm transition-colors"
              >
                Create account
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
