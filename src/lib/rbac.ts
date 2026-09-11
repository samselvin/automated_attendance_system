import type { RoleName } from "@prisma/client";
import type { Session } from "next-auth";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * True if the session user holds `role`. With no `departmentId`, matches the
 * role in any department (a plain "do they have this role at all" check).
 * With a `departmentId`, matches a college-wide grant (departmentId: null)
 * or one scoped to that specific department.
 */
export function hasRole(
  session: Session | null,
  role: RoleName,
  departmentId?: string | null
): boolean {
  if (!session?.user?.isActive) return false;
  return session.user.roles.some((r) => {
    if (r.role !== role) return false;
    if (departmentId === undefined) return true;
    return r.departmentId === null || r.departmentId === departmentId;
  });
}

export function isAdmin(session: Session | null): boolean {
  return hasRole(session, "ADMIN");
}

export function isTeacher(session: Session | null): boolean {
  return hasRole(session, "TEACHER");
}

export function isStudent(session: Session | null): boolean {
  return hasRole(session, "STUDENT");
}

/** Department ids an Admin's role is scoped to. Empty array = college-wide. */
export function adminDepartmentScope(session: Session | null): string[] | "ALL" {
  if (!session?.user?.isActive) return [];
  const adminRoles = session.user.roles.filter((r) => r.role === "ADMIN");
  if (adminRoles.some((r) => r.departmentId === null)) return "ALL";
  return adminRoles.map((r) => r.departmentId).filter((d): d is string => !!d);
}

export function canAccessDepartment(session: Session | null, departmentId: string): boolean {
  const scope = adminDepartmentScope(session);
  if (scope === "ALL") return true;
  return scope.includes(departmentId);
}

export function requireRole(session: Session | null, role: RoleName): void {
  if (!session?.user?.isActive) throw new UnauthorizedError();
  if (!hasRole(session, role)) throw new ForbiddenError(`Requires ${role} role`);
}

export function requireAnyRole(session: Session | null, roles: RoleName[]): void {
  if (!session?.user?.isActive) throw new UnauthorizedError();
  if (!roles.some((r) => hasRole(session, r))) {
    throw new ForbiddenError(`Requires one of: ${roles.join(", ")}`);
  }
}
