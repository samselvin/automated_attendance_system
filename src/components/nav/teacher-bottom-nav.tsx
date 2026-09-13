"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/teacher", label: "Today", icon: "🏠" },
  { href: "/teacher/leave-requests", label: "Leave/OD", icon: "📝" },
  { href: "/teacher/marks", label: "Marks", icon: "🎓" },
  { href: "/teacher/timetable-requests", label: "Requests", icon: "🗓️" },
];

export function TeacherBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-slate-200 bg-white/95 shadow-[0_-2px_8px_rgba(15,23,42,0.05)] backdrop-blur pb-[env(safe-area-inset-bottom)]">
      {ITEMS.map((item) => {
        const active = item.href === "/teacher" ? pathname === "/teacher" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
              active ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span aria-hidden className="text-lg leading-none">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
