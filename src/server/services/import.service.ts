import type { Session } from "next-auth";
import { RoleName, type Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { adminDepartmentScope, canAccessDepartment, ForbiddenError } from "@/lib/rbac";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api-utils";
import { parseCsvText, applyColumnMapping } from "@/lib/import/csv";
import {
  validateStudentRow,
  validateTeacherRow,
  type NormalizedStudentRow,
  type NormalizedTeacherRow,
} from "@/lib/import/validators";
import type { CreateImportJobInput } from "@/lib/validation/import";

type Tx = Prisma.TransactionClient | PrismaClient;

async function resolveTeacherRow(tx: Tx, row: NormalizedTeacherRow, session: Session): Promise<string[]> {
  const errors: string[] = [];

  const department = await tx.department.findUnique({ where: { code: row.departmentCode } });
  if (!department) {
    errors.push(`Unknown departmentCode: ${row.departmentCode}`);
  } else if (!canAccessDepartment(session, department.id)) {
    errors.push(`Outside your department scope: ${row.departmentCode}`);
  }

  const dupEmployeeId = await tx.teacher.findUnique({ where: { employeeId: row.employeeId } });
  if (dupEmployeeId) errors.push(`Employee id already exists: ${row.employeeId}`);

  const existingUser = await tx.user.findUnique({ where: { email: row.email } });
  if (existingUser) {
    if (existingUser.status === "INACTIVE") errors.push(`Deactivated account already exists: ${row.email}`);
    const existingTeacher = await tx.teacher.findUnique({ where: { userId: existingUser.id } });
    if (existingTeacher) errors.push(`Email already registered as a teacher: ${row.email}`);
  }

  return errors;
}

async function resolveStudentRow(tx: Tx, row: NormalizedStudentRow, session: Session): Promise<string[]> {
  const errors: string[] = [];

  const department = await tx.department.findUnique({ where: { code: row.departmentCode } });
  if (!department) errors.push(`Unknown departmentCode: ${row.departmentCode}`);
  else if (!canAccessDepartment(session, department.id)) {
    errors.push(`Outside your department scope: ${row.departmentCode}`);
  }

  const regulation = await tx.regulation.findUnique({ where: { code: row.regulationCode } });
  if (!regulation) errors.push(`Unknown regulationCode: ${row.regulationCode}`);

  const academicYear = await tx.academicYear.findUnique({ where: { label: row.academicYearLabel } });
  if (!academicYear) errors.push(`Unknown academicYearLabel: ${row.academicYearLabel}`);

  let cls = null;
  if (department && academicYear) {
    cls = await tx.class.findUnique({
      where: {
        departmentId_academicYearId_yearOfStudy_section: {
          departmentId: department.id,
          academicYearId: academicYear.id,
          yearOfStudy: row.yearOfStudy,
          section: row.section,
        },
      },
    });
    if (!cls) {
      errors.push(
        `No class found for ${row.departmentCode} year ${row.yearOfStudy} section ${row.section} in ${row.academicYearLabel}`
      );
    }
  }

  let semester = null;
  if (academicYear) {
    semester = await tx.semester.findUnique({
      where: { academicYearId_number: { academicYearId: academicYear.id, number: row.semesterNumber } },
    });
    if (!semester) errors.push(`No semester ${row.semesterNumber} found in ${row.academicYearLabel}`);
  }

  const dupRoll = await tx.student.findUnique({ where: { rollNumber: row.rollNumber } });
  if (dupRoll) errors.push(`Roll number already exists: ${row.rollNumber}`);

  if (row.registerNumber) {
    const dupReg = await tx.student.findUnique({ where: { registerNumber: row.registerNumber } });
    if (dupReg) errors.push(`Register number already exists: ${row.registerNumber}`);
  }

  const existingUser = await tx.user.findUnique({ where: { email: row.email } });
  if (existingUser) {
    if (existingUser.status === "INACTIVE") errors.push(`Deactivated account already exists: ${row.email}`);
    const existingStudent = await tx.student.findUnique({ where: { userId: existingUser.id } });
    if (existingStudent) errors.push(`Email already registered as a student: ${row.email}`);
  }

  return errors;
}

/** Parses, validates and stores a preview (Section 40): valid rows, rows
 * with errors and reasons, and duplicates — nothing is saved as real data
 * yet, only the ImportJob/ImportRow bookkeeping rows. */
export async function createImportJob(
  session: Session,
  input: CreateImportJobInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const { rows: rawRows } = parseCsvText(input.csvText);
  if (rawRows.length === 0) throw new BadRequestError("CSV has no data rows");

  const seenKeys = new Set<string>();

  const evaluated = await Promise.all(
    rawRows.map(async (raw, index) => {
      const mapped = applyColumnMapping(raw, input.columnMapping);
      const rowNumber = index + 2; // account for the header row

      if (input.entityType === "TEACHER") {
        const { errors, normalized } = validateTeacherRow(mapped);
        if (!normalized) return { rowNumber, rawData: mapped, status: "ERROR" as const, errors };

        const key = `email:${normalized.email}|empId:${normalized.employeeId}`;
        if (seenKeys.has(key)) {
          return {
            rowNumber,
            rawData: mapped,
            status: "DUPLICATE" as const,
            errors: ["Duplicate of another row in this file"],
          };
        }
        seenKeys.add(key);

        const dbErrors = await resolveTeacherRow(prisma, normalized, session);
        return {
          rowNumber,
          rawData: mapped,
          status: dbErrors.length > 0 ? ("ERROR" as const) : ("VALID" as const),
          errors: dbErrors,
        };
      }

      const { errors, normalized } = validateStudentRow(mapped);
      if (!normalized) return { rowNumber, rawData: mapped, status: "ERROR" as const, errors };

      const key = `email:${normalized.email}|roll:${normalized.rollNumber}`;
      if (seenKeys.has(key)) {
        return {
          rowNumber,
          rawData: mapped,
          status: "DUPLICATE" as const,
          errors: ["Duplicate of another row in this file"],
        };
      }
      seenKeys.add(key);

      const dbErrors = await resolveStudentRow(prisma, normalized, session);
      return {
        rowNumber,
        rawData: mapped,
        status: dbErrors.length > 0 ? ("ERROR" as const) : ("VALID" as const),
        errors: dbErrors,
      };
    })
  );

  const totals = {
    total: evaluated.length,
    valid: evaluated.filter((r) => r.status === "VALID").length,
    error: evaluated.filter((r) => r.status === "ERROR").length,
    duplicate: evaluated.filter((r) => r.status === "DUPLICATE").length,
  };

  return prisma.$transaction(async (tx) => {
    const job = await tx.importJob.create({
      data: {
        entityType: input.entityType,
        sourceFilename: input.sourceFilename,
        columnMapping: input.columnMapping,
        status: "PREVIEW_READY",
        totalRows: totals.total,
        validRows: totals.valid,
        errorRows: totals.error,
        duplicateRows: totals.duplicate,
        createdById: session.user.id,
      },
    });

    await tx.importRow.createMany({
      data: evaluated.map((r) => ({
        importJobId: job.id,
        rowNumber: r.rowNumber,
        rawData: r.rawData,
        status: r.status,
        errors: r.errors,
      })),
    });

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "IMPORT_PREVIEWED",
        entityType: "ImportJob",
        entityId: job.id,
        newValue: toAuditJson(totals),
        ...ctx,
      },
      tx
    );

    return tx.importJob.findUniqueOrThrow({ where: { id: job.id }, include: { rows: true } });
  });
}

export async function getImportJob(session: Session, id: string) {
  const job = await prisma.importJob.findUnique({ where: { id }, include: { rows: true } });
  if (!job) throw new NotFoundError("Import job not found");
  if (job.createdById !== session.user.id && adminDepartmentScope(session) !== "ALL") {
    throw new ForbiddenError("You cannot view another Admin's import job");
  }
  return job;
}

/** Saves every VALID row in one all-or-nothing transaction (Section 40:
 * "Never save unvalidated ... data"). Re-resolves foreign keys at commit
 * time in case college structure changed since the preview was generated. */
export async function confirmImportJob(
  session: Session,
  id: string,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const job = await prisma.importJob.findUnique({ where: { id }, include: { rows: true } });
  if (!job) throw new NotFoundError("Import job not found");
  if (job.status !== "PREVIEW_READY") throw new ConflictError(`Import job is already ${job.status}`);

  const validRows = job.rows.filter((r) => r.status === "VALID");
  if (validRows.length === 0) throw new BadRequestError("No valid rows to import");

  return prisma.$transaction(async (tx) => {
    let imported = 0;

    for (const row of validRows) {
      if (job.entityType === "TEACHER") {
        const { normalized } = validateTeacherRow(row.rawData as Record<string, string>);
        if (!normalized) throw new ConflictError(`Row ${row.rowNumber} failed re-validation at confirm time`);
        const dbErrors = await resolveTeacherRow(tx, normalized, session);
        if (dbErrors.length > 0) {
          throw new ConflictError(`Row ${row.rowNumber}: ${dbErrors.join("; ")}`);
        }
        const department = await tx.department.findUniqueOrThrow({ where: { code: normalized.departmentCode } });
        const user = await tx.user.create({ data: { email: normalized.email, status: "ACTIVE" } });
        await tx.teacher.create({
          data: {
            userId: user.id,
            employeeId: normalized.employeeId,
            fullName: normalized.fullName,
            designation: normalized.designation,
            departmentId: department.id,
            mobileNumber: normalized.mobileNumber,
          },
        });
        await tx.userRole.create({
          data: { userId: user.id, role: RoleName.TEACHER, departmentId: department.id },
        });
      } else {
        const { normalized } = validateStudentRow(row.rawData as Record<string, string>);
        if (!normalized) throw new ConflictError(`Row ${row.rowNumber} failed re-validation at confirm time`);
        const dbErrors = await resolveStudentRow(tx, normalized, session);
        if (dbErrors.length > 0) {
          throw new ConflictError(`Row ${row.rowNumber}: ${dbErrors.join("; ")}`);
        }
        const department = await tx.department.findUniqueOrThrow({ where: { code: normalized.departmentCode } });
        const regulation = await tx.regulation.findUniqueOrThrow({ where: { code: normalized.regulationCode } });
        const academicYear = await tx.academicYear.findUniqueOrThrow({
          where: { label: normalized.academicYearLabel },
        });
        const cls = await tx.class.findUniqueOrThrow({
          where: {
            departmentId_academicYearId_yearOfStudy_section: {
              departmentId: department.id,
              academicYearId: academicYear.id,
              yearOfStudy: normalized.yearOfStudy,
              section: normalized.section,
            },
          },
        });
        const semester = await tx.semester.findUniqueOrThrow({
          where: { academicYearId_number: { academicYearId: academicYear.id, number: normalized.semesterNumber } },
        });

        const user = await tx.user.create({ data: { email: normalized.email, status: "ACTIVE" } });
        const student = await tx.student.create({
          data: {
            userId: user.id,
            rollNumber: normalized.rollNumber,
            registerNumber: normalized.registerNumber,
            fullName: normalized.fullName,
            dateOfBirth: normalized.dateOfBirth ? new Date(`${normalized.dateOfBirth}T00:00:00.000Z`) : undefined,
            departmentId: department.id,
            regulationId: regulation.id,
            batchLabel: normalized.batchLabel,
            admissionType: normalized.admissionType,
          },
        });
        await tx.parentContact.create({
          data: {
            studentId: student.id,
            name: normalized.parentName,
            relationship: normalized.parentRelationship,
            mobileNumber: normalized.parentMobile,
            isSmsContact: true,
          },
        });
        await tx.studentEnrollment.create({
          data: {
            studentId: student.id,
            classId: cls.id,
            semesterId: semester.id,
            effectiveFrom: new Date(`${normalized.effectiveFrom}T00:00:00.000Z`),
            status: "ACTIVE",
          },
        });
        await tx.userRole.create({
          data: { userId: user.id, role: RoleName.STUDENT, departmentId: department.id },
        });
      }

      await tx.importRow.update({ where: { id: row.id }, data: { status: "IMPORTED" } });
      imported += 1;
    }

    const updatedJob = await tx.importJob.update({
      where: { id },
      data: { status: "CONFIRMED", validRows: imported },
    });

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "IMPORT_CONFIRMED",
        entityType: "ImportJob",
        entityId: id,
        newValue: toAuditJson({ imported }),
        ...ctx,
      },
      tx
    );

    return updatedJob;
  });
}
