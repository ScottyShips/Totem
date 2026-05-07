"use client";

import { useState } from "react";

import { ApiError } from "@/lib/api";

interface Props {
  onClose: () => void;
  onSend: (phoneNumber: string) => Promise<void>;
}

export default function InviteModal({ onClose, onSend }: Props) {
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSend(phone.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-4 pb-8 sm:pb-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-midnight-900 border border-midnight-800 rounded-xl p-6 w-full max-w-sm">
        {success ? (
          <div className="text-center py-4">
            <p className="text-midnight-100 font-semibold mb-1">Invitation sent!</p>
            <p className="text-midnight-400 text-sm mb-4">
              They&apos;ll get a text with a link to join.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-midnight-800 hover:bg-midnight-700 text-midnight-300 font-medium text-sm rounded-lg py-2.5 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-midnight-100 font-semibold text-lg mb-1">Invite by text</h2>
            <p className="text-midnight-500 text-sm mb-4">
              They&apos;ll receive a link to join this group on Totem.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-midnight-300 mb-1.5"
                >
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+15555551234"
                  className="w-full bg-midnight-800 border border-midnight-700 text-midnight-100 rounded-lg px-3 py-2.5 text-sm placeholder:text-midnight-600 focus:outline-none focus:ring-2 focus:ring-iris-500 focus:border-transparent"
                />
                <p className="text-midnight-600 text-xs mt-1.5">Include country code — e.g. +1 for US</p>
              </div>

              {error && <p className="text-flame-400 text-sm">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-midnight-800 hover:bg-midnight-700 text-midnight-300 font-medium text-sm rounded-lg py-2.5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || phone.trim().length === 0}
                  className="flex-1 bg-iris-500 hover:bg-iris-400 disabled:opacity-50 disabled:cursor-not-allowed text-midnight-950 font-semibold text-sm rounded-lg py-2.5 transition-colors"
                >
                  {submitting ? "Sending…" : "Send invite"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
