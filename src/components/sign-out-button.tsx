"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
    >
      <LogOut aria-hidden size={15} strokeWidth={2} />
      Sign out
    </button>
  );
}
