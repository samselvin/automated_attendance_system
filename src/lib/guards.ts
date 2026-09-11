import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import type { RoleName } from "@prisma/client";
import type { Session } from "next-auth";

/** Server-component guard: redirects to /login if not signed in or inactive. */
export async function requireSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user || !session.user.isActive) {
    redirect("/login");
  }
  return session;
}

/** Server-component guard: redirects to /forbidden if the role is missing. */
export async function requireRolePage(role: RoleName): Promise<Session> {
  const session = await requireSession();
  if (!hasRole(session, role)) {
    redirect("/forbidden");
  }
  return session;
}
