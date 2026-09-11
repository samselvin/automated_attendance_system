import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { canAccessDepartment, isAdmin, isTeacher, ForbiddenError } from "@/lib/rbac";
import { isActiveClassAdvisor } from "@/lib/class-advisor";
import { hasTeacherPermission } from "@/lib/permissions";
import { notifyUser } from "@/lib/notify";
import { BadRequestError } from "@/lib/api-utils";
import type { AssignSubstituteInput } from "@/lib/validation/substitution";

async function requireSubstituteAssignAccess(session: Session, departmentId: string, classId?: string) {
  if (isAdmin(session)) {
    if (!canAccessDepartment(session, departmentId)) throw new ForbiddenError("Outside your department scope");
    return;
  }
  if (isTeacher(session) && session.user.teacherId && classId) {
    const isAdvisor = await isActiveClassAdvisor(session.user.teacherId, classId);
    const permitted = isAdvisor && (await hasTeacherPermission(session.user.teacherId, "ASSIGN_SUBSTITUTE", { classId }));
    if (permitted) return;
  }
  throw new ForbiddenError("Not authorized to assign substitutes");
}

export async function listSubstitutions(filters: { date?: Date; teacherId?: string } = {}) {
  return prisma.substitution.findMany({
    where: {
      ...(filters.date ? { date: filters.date } : {}),
      ...(filters.teacherId
        ? { OR: [{ originalTeacherId: filters.teacherId }, { substituteTeacherId: filters.teacherId }] }
        : {}),
    },
    include: { originalTeacher: true, substituteTeacher: true },
    orderBy: { date: "desc" },
  });
}

export async function assignSubstitute(
  session: Session,
  input: AssignSubstituteInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const [originalTeacher, substituteTeacher] = await Promise.all([
    prisma.teacher.findUnique({ where: { id: input.originalTeacherId } }),
    prisma.teacher.findUnique({ where: { id: input.substituteTeacherId } }),
  ]);
  if (!originalTeacher) throw new BadRequestError("Original teacher not found");
  if (!substituteTeacher) throw new BadRequestError("Substitute teacher not found");

  if (input.timetableEntryId) {
    const entry = await prisma.timetableEntry.findUnique({
      where: { id: input.timetableEntryId },
      include: { timetableVersion: true },
    });
    if (!entry) throw new BadRequestError("Timetable entry not found");
    await requireSubstituteAssignAccess(session, originalTeacher.departmentId, entry.timetableVersion.classId);
  } else {
    await requireSubstituteAssignAccess(session, originalTeacher.departmentId, input.classId);
  }

  return prisma.$transaction(async (tx) => {
    const substitution = await tx.substitution.create({
      data: { ...input, authorizedById: session.user.id },
    });

    await notifyUser(
      originalTeacher.userId,
      "SUBSTITUTION_ASSIGNED",
      "Substitute assigned for your class",
      `${substituteTeacher.fullName} will substitute for you on ${input.date.toDateString()}.`,
      undefined,
      tx
    );
    await notifyUser(
      substituteTeacher.userId,
      "SUBSTITUTION_ASSIGNED",
      "You've been assigned as a substitute",
      `You are substituting for ${originalTeacher.fullName} on ${input.date.toDateString()}.`,
      undefined,
      tx
    );

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        action: "SUBSTITUTE_ASSIGNED",
        entityType: "Substitution",
        entityId: substitution.id,
        newValue: toAuditJson(substitution),
        ...ctx,
      },
      tx
    );

    return substitution;
  });
}
