import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { canAccessDepartment, ForbiddenError } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-utils";
import type { CreateStudentGroupInput, SetGroupMembersInput } from "@/lib/validation/student-group";

async function requireClassAccess(session: Session, classId: string) {
  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new BadRequestError("Class not found");
  if (!canAccessDepartment(session, cls.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }
  return cls;
}

export async function listStudentGroups(session: Session, classId: string) {
  await requireClassAccess(session, classId);
  return prisma.studentGroup.findMany({
    where: { classId },
    include: { members: { include: { student: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createStudentGroup(
  session: Session,
  input: CreateStudentGroupInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  await requireClassAccess(session, input.classId);

  return prisma.$transaction(async (tx) => {
    const group = await tx.studentGroup.create({ data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "STUDENT_GROUP_CREATED",
        entityType: "StudentGroup",
        entityId: group.id,
        newValue: toAuditJson(group),
        ...ctx,
      },
      tx
    );
    return group;
  });
}

/** Replaces the group's full membership list in one transaction. */
export async function setGroupMembers(
  session: Session,
  groupId: string,
  input: SetGroupMembersInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const group = await prisma.studentGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new NotFoundError("Student group not found");
  await requireClassAccess(session, group.classId);

  const validStudents = await prisma.studentEnrollment.findMany({
    where: { classId: group.classId, status: "ACTIVE", studentId: { in: input.studentIds } },
    select: { studentId: true },
  });
  const validIds = new Set(validStudents.map((s) => s.studentId));
  const invalid = input.studentIds.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    throw new BadRequestError(`Not enrolled in this class: ${invalid.join(", ")}`);
  }

  return prisma.$transaction(async (tx) => {
    const before = await tx.studentGroupMember.findMany({ where: { studentGroupId: groupId } });
    await tx.studentGroupMember.deleteMany({ where: { studentGroupId: groupId } });
    await tx.studentGroupMember.createMany({
      data: input.studentIds.map((studentId) => ({ studentGroupId: groupId, studentId })),
    });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "STUDENT_GROUP_MEMBERS_SET",
        entityType: "StudentGroup",
        entityId: groupId,
        oldValue: toAuditJson(before.map((b) => b.studentId)),
        newValue: toAuditJson(input.studentIds),
        ...ctx,
      },
      tx
    );
    return tx.studentGroupMember.findMany({ where: { studentGroupId: groupId }, include: { student: true } });
  });
}
