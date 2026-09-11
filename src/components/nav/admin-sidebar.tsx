"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    title: "College structure",
    items: [
      { href: "/admin/departments", label: "Departments" },
      { href: "/admin/academic-years", label: "Academic Years" },
      { href: "/admin/classes", label: "Classes" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/teachers", label: "Teachers" },
      { href: "/admin/students", label: "Students" },
      { href: "/admin/class-advisors", label: "Class Advisors" },
      { href: "/admin/imports", label: "Imports" },
    ],
  },
  {
    title: "Academics",
    items: [
      { href: "/admin/regulations", label: "Regulations & Grading" },
      { href: "/admin/subjects", label: "Subjects & Offerings" },
    ],
  },
  {
    title: "Timetable",
    items: [
      { href: "/admin/bell-schedules", label: "Bell Schedules" },
      { href: "/admin/timetables", label: "Timetables" },
      { href: "/admin/calendar", label: "Calendar" },
      { href: "/admin/substitutions", label: "Substitutions" },
    ],
  },
  {
    title: "Approvals",
    items: [
      { href: "/admin/leave-requests", label: "Leave / OD" },
      { href: "/admin/timetable-requests", label: "Timetable Requests" },
      { href: "/admin/unlock-requests", label: "Late-Attendance Unlocks" },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/admin/reports", label: "Reports & Export" },
      { href: "/admin/events", label: "Events" },
    ],
  },
];

const COLLEGE_WIDE_SECTION = {
  title: "System",
  items: [
    { href: "/admin/settings", label: "Settings" },
    { href: "/admin/audit-logs", label: "Audit Logs" },
  ],
};

export function AdminSidebar({ showCollegeWideAdminLinks = false }: { showCollegeWideAdminLinks?: boolean }) {
  const pathname = usePathname();
  const sections = showCollegeWideAdminLinks ? [...SECTIONS, COLLEGE_WIDE_SECTION] : SECTIONS;

  return (
    <nav className="hidden w-60 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-4 md:block">
      {sections.map((section) => (
        <div key={section.title} className="mb-5">
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{section.title}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-lg px-2 py-1.5 text-sm ${
                      active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
