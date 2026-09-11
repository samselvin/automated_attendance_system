import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { adminDepartmentScope, ForbiddenError } from "@/lib/rbac";
import { ConflictError, NotFoundError } from "@/lib/api-utils";
import type {
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
  CreateSemesterInput,
  UpdateSemesterInput,
} from "@/lib/validation/academic-year";

function requireCollegeWideAdmin(session: Session) {
  if (adminDepartmentScope(session) !== "ALL") {
    throw new ForbiddenError("Requires a college-wide Admin role");
  }
}

export async function listAcademicYears() {
  return prisma.academicYear.findMany({
    include: { semesters: { orderBy: { number: "asc" } } },
    orderBy: { startDate: "desc" },
  });
}

export async function createAcademicYear(
  session: Session,
  input: CreateAcademicYearInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireCollegeWideAdmin(session);

  const existing = await prisma.academicYear.findUnique({ where: { label: input.label } });
  if (existing) throw new ConflictError(`Academic year ${input.label} already exists`);

  return prisma.$transaction(async (tx) => {
    const ay = await tx.academicYear.create({ data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "ACADEMIC_YEAR_CREATED",
        entityType: "AcademicYear",
        entityId: ay.id,
        newValue: toAuditJson(ay),
        ...ctx,
      },
      tx
    );
    return ay;
  });
}

/** Only one academic year may be "current" at a time — flip the old one off
 * and the new one on inside a single transaction. */
export async function setCurrentAcademicYear(
  session: Session,
  id: string,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireCollegeWideAdmin(session);

  const target = await prisma.academicYear.findUnique({ where: { id } });
  if (!target) throw new NotFoundError("Academic year not found");

  return prisma.$transaction(async (tx) => {
    await tx.academicYear.updateMany({
      where: { isCurrent: true, id: { not: id } },
      data: { isCurrent: false },
    });
    const updated = await tx.academicYear.update({ where: { id }, data: { isCurrent: true } });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "ACADEMIC_YEAR_SET_CURRENT",
        entityType: "AcademicYear",
        entityId: id,
        newValue: toAuditJson(updated),
        ...ctx,
      },
      tx
    );
    return updated;
  });
}

export async function updateAcademicYear(
  session: Session,
  id: string,
  input: UpdateAcademicYearInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireCollegeWideAdmin(session);
  const existing = await prisma.academicYear.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Academic year not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.academicYear.update({ where: { id }, data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "ACADEMIC_YEAR_UPDATED",
        entityType: "AcademicYear",
        entityId: id,
        oldValue: toAuditJson(existing),
        newValue: toAuditJson(updated),
        ...ctx,
      },
      tx
    );
    return updated;
  });
}

export async function createSemester(
  session: Session,
  academicYearId: string,
  input: CreateSemesterInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireCollegeWideAdmin(session);

  const ay = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!ay) throw new NotFoundError("Academic year not found");

  const existing = await prisma.semester.findUnique({
    where: { academicYearId_number: { academicYearId, number: input.number } },
  });
  if (existing) throw new ConflictError(`Semester ${input.number} already exists for ${ay.label}`);

  return prisma.$transaction(async (tx) => {
    const semester = await tx.semester.create({ data: { academicYearId, ...input } });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "SEMESTER_CREATED",
        entityType: "Semester",
        entityId: semester.id,
        newValue: toAuditJson(semester),
        ...ctx,
      },
      tx
    );
    return semester;
  });
}

export async function updateSemester(
  session: Session,
  id: string,
  input: UpdateSemesterInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireCollegeWideAdmin(session);
  const existing = await prisma.semester.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Semester not found");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.semester.update({ where: { id }, data: input });
    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "SEMESTER_UPDATED",
        entityType: "Semester",
        entityId: id,
        oldValue: toAuditJson(existing),
        newValue: toAuditJson(updated),
        ...ctx,
      },
      tx
    );
    return updated;
  });
}
