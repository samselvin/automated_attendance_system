import type { ReactNode } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationBell } from "@/components/notification-bell";

export function TopBar({
  title,
  subtitle,
  showNotifications = true,
  extra,
}: {
  title: string;
  subtitle?: string;
  showNotifications?: boolean;
  extra?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div>
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {showNotifications ? <NotificationBell /> : null}
        <SignOutButton />
      </div>
    </header>
  );
}
