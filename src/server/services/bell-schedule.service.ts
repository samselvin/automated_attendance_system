import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { adminDepartmentScope, canAccessDepartment, ForbiddenError } from "@/lib/rbac";
import { BadRequestError, NotFoundError } from "@/lib/api-utils";
import { validateBellScheduleSlots } from "@/lib/timetable/validate";
import type { CreateBellScheduleInput } from "@/lib/validation/bell-schedule";

export async function listBellSchedules(session: Session, filters: { departmentId?: string } = {}) {
  const scope = adminDepartmentScope(session);
  if (filters.departmentId && !canAccessDepartment(session, filters.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }
  const where =
    filters.departmentId != null
      ? { OR: [{ departmentId: filters.departmentId }, { departmentId: null }] }
      : scope === "ALL"
        ? {}
        : { OR: [{ departmentId: { in: scope } }, { departmentId: null }] };

  return prisma.bellSchedule.findMany({
    where,
    include: { slots: { orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  });
}

export async function createBellSchedule(
  session: Session,
  input: CreateBellScheduleInput,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  if (input.departmentId && !canAccessDepartment(session, input.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  } else if (!input.departmentId && adminDepartmentScope(session) !== "ALL") {
    throw new ForbiddenError("Requires a college-wide Admin role for a college-wide bell schedule");
  }

  const slotErrors = validateBellScheduleSlots(input.slots);
  if (slotErrors.length > 0) throw new BadRequestError(slotErrors.join("; "));

  const sortOrders = new Set(input.slots.map((s) => s.sortOrder));
  if (sortOrders.size !== input.slots.length) throw new BadRequestError("sortOrder values must be unique");

  return prisma.$transaction(async (tx) => {
    const bellSchedule = await tx.bellSchedule.create({
      data: {
        name: input.name,
        departmentId: input.departmentId,
        isDefault: input.isDefault,
      },
    });

    await tx.bellScheduleSlot.createMany({
      data: input.slots.map((s) => ({ ...s, bellScheduleId: bellSchedule.id })),
    });

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "BELL_SCHEDULE_CREATED",
        entityType: "BellSchedule",
        entityId: bellSchedule.id,
        newValue: toAuditJson({ ...bellSchedule, slots: input.slots }),
        ...ctx,
      },
      tx
    );

    return tx.bellSchedule.findUniqueOrThrow({
      where: { id: bellSchedule.id },
      include: { slots: { orderBy: { sortOrder: "asc" } } },
    });
  });
}

/** Replaces the slot list wholesale — simplest safe way to edit a bell
 * schedule without leaving stale slots. Refuses when any timetable version
 * already uses this schedule, so published timetables are never silently
 * invalidated. */
export async function replaceBellScheduleSlots(
  session: Session,
  bellScheduleId: string,
  slots: CreateBellScheduleInput["slots"],
  ctx: { ipAddress?: string; userAgent?: string }
) {
  const schedule = await prisma.bellSchedule.findUnique({
    where: { id: bellScheduleId },
    include: { slots: true },
  });
  if (!schedule) throw new NotFoundError("Bell schedule not found");
  if (schedule.departmentId && !canAccessDepartment(session, schedule.departmentId)) {
    throw new ForbiddenError("Outside your department scope");
  }

  const inUse = await prisma.timetableVersion.count({ where: { bellScheduleId } });
  if (inUse > 0) {
    throw new BadRequestError(
      "This bell schedule is used by an existing timetable version — create a new bell schedule instead of editing this one"
    );
  }

  const slotErrors = validateBellScheduleSlots(slots);
  if (slotErrors.length > 0) throw new BadRequestError(slotErrors.join("; "));

  return prisma.$transaction(async (tx) => {
    await tx.bellScheduleSlot.deleteMany({ where: { bellScheduleId } });
    await tx.bellScheduleSlot.createMany({ data: slots.map((s) => ({ ...s, bellScheduleId })) });

    await writeAuditLog(
      {
        actorUserId: session.user.id,
        actorRole: "ADMIN",
        action: "BELL_SCHEDULE_SLOTS_REPLACED",
        entityType: "BellSchedule",
        entityId: bellScheduleId,
        oldValue: toAuditJson(schedule.slots),
        newValue: toAuditJson(slots),
        ...ctx,
      },
      tx
    );

    return tx.bellSchedule.findUniqueOrThrow({
      where: { id: bellScheduleId },
      include: { slots: { orderBy: { sortOrder: "asc" } } },
    });
  });
}
