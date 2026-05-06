"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    router.replace("/login");
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur border-b border-zinc-900">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/groups"
          className="text-zinc-100 font-bold text-lg tracking-tight hover:text-amber-400 transition-colors"
        >
          Totem
        </Link>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={open}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            <Avatar name={user.display_name} size="sm" />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-zinc-100 text-sm font-medium truncate">
                  {user.display_name}
                </p>
                <p className="text-zinc-500 text-xs truncate mt-0.5">{user.email}</p>
              </div>
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="block px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Account settings
              </Link>
              <button
                onClick={handleLogout}
                role="menuitem"
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
