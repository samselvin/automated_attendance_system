"use client";

import { useRouter, usePathname } from "next/navigation";

const LINKS = [
  ["/admin", "Dashboard"],
  ["/admin/departments", "Departments"],
  ["/admin/academic-years", "Academic Years"],
  ["/admin/classes", "Classes"],
  ["/admin/teachers", "Teachers"],
  ["/admin/students", "Students"],
  ["/admin/class-advisors", "Class Advisors"],
  ["/admin/imports", "Imports"],
  ["/admin/regulations", "Regulations & Grading"],
  ["/admin/subjects", "Subjects & Offerings"],
  ["/admin/bell-schedules", "Bell Schedules"],
  ["/admin/timetables", "Timetables"],
  ["/admin/calendar", "Calendar"],
  ["/admin/substitutions", "Substitutions"],
  ["/admin/leave-requests", "Leave / OD"],
  ["/admin/timetable-requests", "Timetable Requests"],
  ["/admin/unlock-requests", "Late-Attendance Unlocks"],
  ["/admin/reports", "Reports & Export"],
  ["/admin/events", "Events"],
] as const;

const COLLEGE_WIDE_LINKS = [
  ["/admin/settings", "Settings"],
  ["/admin/audit-logs", "Audit Logs"],
] as const;

export function AdminMobileNav({ showCollegeWideAdminLinks = false }: { showCollegeWideAdminLinks?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const links = showCollegeWideAdminLinks ? [...LINKS, ...COLLEGE_WIDE_LINKS] : LINKS;

  return (
    <div className="border-b border-slate-200 bg-white p-2 md:hidden">
      <select
        value={pathname}
        onChange={(e) => router.push(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      >
        {links.map(([href, label]) => (
          <option key={href} value={href}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
