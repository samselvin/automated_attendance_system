import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, generateTempPassword } from "@/lib/password";
import { writeAuditLog } from "@/lib/audit";
import { adminDepartmentScope, canAccessDepartment, ForbiddenError } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-utils";
import type { ChangePasswordInput } from "@/lib/validation/password";

export async function changeOwnPassword(
  session: Session,
  input: ChangePasswordInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.passwordHash) {
    throw new BadRequestError("This account does not have a password set");
  }

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) throw new BadRequestError("Current password is incorrect");

  const newHash = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, mustChangePassword: false },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "PASSWORD_CHANGED_SELF",
    entityType: "User",
    entityId: user.id,
    ...ctx,
  });
}

/** Finds the department a target user's profile belongs to, so an Admin's
 * password-reset action can be scoped like every other write. Returns null
 * for a user with no Teacher/Student profile (i.e. another Admin). */
async function targetUserDepartmentId(userId: string): Promise<string | null> {
  const [teacher, student] = await Promise.all([
    prisma.teacher.findUnique({ where: { userId } }),
    prisma.student.findUnique({ where: { userId } }),
  ]);
  return teacher?.departmentId ?? student?.departmentId ?? null;
}

/** Admin-issued password reset (Section 6's recovery procedure, and the
 * general "forgot password" path since there is no self-service email
 * flow). Returns the new temp password once — callers must relay it
 * out-of-band and never log or store it in plaintext. */
export async function resetUserPassword(
  session: Session,
  targetUserId: string,
  ctx: { ipAddress?: string; userAgent?: string }
): Promise<{ tempPassword: string }> {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError("User not found");

  const departmentId = await targetUserDepartmentId(targetUserId);
  if (departmentId) {
    if (!canAccessDepartment(session, departmentId)) {
      throw new ForbiddenError("Outside your department scope");
    }
  } else if (session.user.id !== targetUserId) {
    // Resetting another Admin's (or a departmentless account's) password
    // requires a college-wide Admin — a department-scoped Admin may only
    // reset their own.
    if (adminDepartmentScope(session) !== "ALL") {
      throw new ForbiddenError("Requires a college-wide Admin role");
    }
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "ADMIN",
    action: "PASSWORD_RESET_BY_ADMIN",
    entityType: "User",
    entityId: targetUserId,
    ...ctx,
  });

  return { tempPassword };
}
