"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, GraduationCap, CalendarDays, User } from "lucide-react";

const ITEMS = [
  { href: "/student", label: "Home", Icon: Home },
  { href: "/student/attendance", label: "Attendance", Icon: ClipboardList },
  { href: "/student/academics", label: "Academics", Icon: GraduationCap },
  { href: "/student/timetable", label: "Timetable", Icon: CalendarDays },
  { href: "/student/profile", label: "Profile", Icon: User },
];

export function StudentBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-5 border-t border-slate-200 bg-white/95 shadow-[0_-2px_8px_rgba(15,23,42,0.05)] backdrop-blur pb-[env(safe-area-inset-bottom)]">
      {ITEMS.map((item) => {
        const active = item.href === "/student" ? pathname === "/student" : pathname.startsWith(item.href);
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
