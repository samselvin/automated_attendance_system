"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/student", label: "Home", icon: "🏠" },
  { href: "/student/attendance", label: "Attendance", icon: "📋" },
  { href: "/student/academics", label: "Academics", icon: "🎓" },
  { href: "/student/timetable", label: "Timetable", icon: "🗓️" },
  { href: "/student/profile", label: "Profile", icon: "👤" },
];

export function StudentBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {ITEMS.map((item) => {
        const active = item.href === "/student" ? pathname === "/student" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              active ? "text-slate-900" : "text-slate-400"
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
