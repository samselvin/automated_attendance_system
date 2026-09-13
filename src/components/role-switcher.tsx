"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

const ROLE_META: Record<string, { href: string; label: string }> = {
  ADMIN: { href: "/admin", label: "Admin" },
  TEACHER: { href: "/teacher", label: "Teacher" },
  STUDENT: { href: "/student", label: "Student" },
};

/** Section 51 calls out "multi-role switching" as a real scenario to
 * support — an account can hold more than one role (Admin, Teacher and
 * Student all on the same login), but the sign-in redirect always picks
 * one (Admin > Teacher > Student). This is how you reach the others
 * without editing the URL by hand. */
export function RoleSwitcher({ roles, current }: { roles: string[]; current: string }) {
  const [open, setOpen] = useState(false);
  const others = [...new Set(roles)].filter((r) => r !== current && ROLE_META[r]);
  if (others.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-30 md:bottom-6">
      {open ? (
        <div className="mb-2 min-w-[10rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Switch view</p>
          {others.map((r) => (
            <Link
              key={r}
              href={ROLE_META[r].href}
              className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
              onClick={() => setOpen(false)}
            >
              {ROLE_META[r].label}
            </Link>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700"
      >
        <ArrowLeftRight aria-hidden size={14} strokeWidth={2.25} />
        Switch view
      </button>
    </div>
  );
}
