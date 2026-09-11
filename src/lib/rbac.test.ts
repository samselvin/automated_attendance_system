import { describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import {
  hasRole,
  isAdmin,
  isTeacher,
  isStudent,
  adminDepartmentScope,
  canAccessDepartment,
  requireRole,
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/rbac";

function session(overrides: Partial<Session["user"]> = {}): Session {
  return {
    expires: new Date(Date.now() + 86_400_000).toISOString(),
    user: {
      id: "user-1",
      email: "teacher@psncet.ac.in",
      isActive: true,
      roles: [],
      teacherId: null,
      studentId: null,
      isBootstrapAdmin: false,
      ...overrides,
    },
  };
}

describe("hasRole", () => {
  it("returns false for an inactive session", () => {
    const s = session({ isActive: false, roles: [{ role: "ADMIN", departmentId: null }] });
    expect(hasRole(s, "ADMIN")).toBe(false);
  });

  it("returns false for a null session", () => {
    expect(hasRole(null, "ADMIN")).toBe(false);
  });

  it("matches a college-wide role regardless of requested department", () => {
    const s = session({ roles: [{ role: "ADMIN", departmentId: null }] });
    expect(hasRole(s, "ADMIN", "dept-aids")).toBe(true);
  });

  it("matches a department-scoped role only for that department", () => {
    const s = session({ roles: [{ role: "ADMIN", departmentId: "dept-aids" }] });
    expect(hasRole(s, "ADMIN", "dept-aids")).toBe(true);
    expect(hasRole(s, "ADMIN", "dept-cse")).toBe(false);
  });

  it("supports a user holding multiple roles", () => {
    const s = session({
      roles: [
        { role: "TEACHER", departmentId: "dept-aids" },
        { role: "ADMIN", departmentId: "dept-aids" },
      ],
    });
    expect(isTeacher(s)).toBe(true);
    expect(isAdmin(s)).toBe(true);
    expect(isStudent(s)).toBe(false);
  });
});

describe("adminDepartmentScope", () => {
  it("is ALL when any admin role is college-wide", () => {
    const s = session({
      roles: [
        { role: "ADMIN", departmentId: "dept-aids" },
        { role: "ADMIN", departmentId: null },
      ],
    });
    expect(adminDepartmentScope(s)).toBe("ALL");
  });

  it("lists scoped department ids when no college-wide role exists", () => {
    const s = session({ roles: [{ role: "ADMIN", departmentId: "dept-aids" }] });
    expect(adminDepartmentScope(s)).toEqual(["dept-aids"]);
  });

  it("is empty for a non-admin session", () => {
    const s = session({ roles: [{ role: "TEACHER", departmentId: "dept-aids" }] });
    expect(adminDepartmentScope(s)).toEqual([]);
  });
});

describe("canAccessDepartment", () => {
  it("allows a college-wide admin into any department", () => {
    const s = session({ roles: [{ role: "ADMIN", departmentId: null }] });
    expect(canAccessDepartment(s, "dept-cse")).toBe(true);
  });

  it("blocks a department-scoped admin from another department", () => {
    const s = session({ roles: [{ role: "ADMIN", departmentId: "dept-aids" }] });
    expect(canAccessDepartment(s, "dept-cse")).toBe(false);
  });
});

describe("requireRole", () => {
  it("throws UnauthorizedError when there is no session", () => {
    expect(() => requireRole(null, "ADMIN")).toThrow(UnauthorizedError);
  });

  it("throws ForbiddenError when the role is missing", () => {
    const s = session({ roles: [{ role: "STUDENT", departmentId: null }] });
    expect(() => requireRole(s, "ADMIN")).toThrow(ForbiddenError);
  });

  it("does not throw when the role is present", () => {
    const s = session({ roles: [{ role: "ADMIN", departmentId: null }] });
    expect(() => requireRole(s, "ADMIN")).not.toThrow();
  });
});
