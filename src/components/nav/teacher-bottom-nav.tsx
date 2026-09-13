"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileEdit, GraduationCap, CalendarDays } from "lucide-react";

const ITEMS = [
  { href: "/teacher", label: "Today", Icon: Home },
  { href: "/teacher/leave-requests", label: "Leave/OD", Icon: FileEdit },
  { href: "/teacher/marks", label: "Marks", Icon: GraduationCap },
  { href: "/teacher/timetable-requests", label: "Requests", Icon: CalendarDays },
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
            <item.Icon aria-hidden size={20} strokeWidth={active ? 2.25 : 1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
