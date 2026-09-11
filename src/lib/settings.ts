import { prisma } from "@/lib/prisma";

const DEFAULTS: Record<string, unknown> = {
  CLASS_ADVISOR_MAX_ACTIVE: 1,
};

export async function getSetting<T = unknown>(key: string): Promise<T> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (row) return row.value as T;
  if (key in DEFAULTS) return DEFAULTS[key] as T;
  throw new Error(`Unknown system setting: ${key}`);
}
