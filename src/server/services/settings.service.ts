import type { Session } from "next-auth";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adminDepartmentScope, requireRole, ForbiddenError } from "@/lib/rbac";
import { BadRequestError } from "@/lib/api-utils";
import { writeAuditLog, toAuditJson } from "@/lib/audit";
import { ALL_SETTINGS_SCHEMA, findSettingDef, zodSchemaForSetting } from "@/lib/settings-schema";

/**
 * College-wide settings (Section 22) have no per-department scope — a
 * `SystemSetting` row applies to every department at once — so, like
 * Audit Logs, this is restricted to a college-wide Admin rather than
 * letting a department-scoped Admin change a rule that affects
 * departments outside their own scope.
 */
function requireCollegeWideAdmin(session: Session) {
  requireRole(session, "ADMIN");
  if (adminDepartmentScope(session) !== "ALL") {
    throw new ForbiddenError("Settings are visible to a college-wide Admin only");
  }
}

export async function listSystemSettings(session: Session) {
  requireCollegeWideAdmin(session);

  const rows = await prisma.systemSetting.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));

  return ALL_SETTINGS_SCHEMA.map((def) => {
    const row = byKey.get(def.key);
    return {
      key: def.key,
      value: row ? row.value : def.fallback,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      isDefault: !row,
    };
  });
}

export async function updateSystemSetting(
  session: Session,
  key: string,
  value: unknown,
  ctx: { ipAddress?: string; userAgent?: string }
) {
  requireCollegeWideAdmin(session);

  const def = findSettingDef(key);
  if (!def) throw new BadRequestError(`Unknown setting: ${key}`);

  const parsed = zodSchemaForSetting(def).safeParse(value);
  if (!parsed.success) {
    throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid value for this setting");
  }

  const existing = await prisma.systemSetting.findUnique({ where: { key } });
  const updated = await prisma.systemSetting.upsert({
    where: { key },
    update: { value: parsed.data as Prisma.InputJsonValue, updatedById: session.user.id },
    create: {
      key,
      value: parsed.data as Prisma.InputJsonValue,
      description: def.help,
      updatedById: session.user.id,
    },
  });

  await writeAuditLog({
    actorUserId: session.user.id,
    actorRole: "ADMIN",
    action: "SETTINGS_CHANGED",
    entityType: "SystemSetting",
    entityId: key,
    oldValue: existing ? toAuditJson(existing.value) : null,
    newValue: toAuditJson(parsed.data),
    ...ctx,
  });

  return { key, value: updated.value, updatedAt: updated.updatedAt.toISOString() };
}
