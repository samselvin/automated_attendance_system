import { prisma } from "@/lib/prisma";

/**
 * Checks a specific HOD/Admin-granted permission for one teacher (Section
 * 12, 17, 30) — scoped to a class if the grant names one, else to a
 * department, else college-wide for that teacher.
 */
export async function hasTeacherPermission(
  teacherId: string,
  permissionKey: string,
  scope: { classId?: string; departmentId?: string } = {}
): Promise<boolean> {
  const grant = await prisma.teacherPermissionGrant.findFirst({
    where: {
      teacherId,
      status: "ACTIVE",
      permission: { key: permissionKey },
      OR: [
        { classId: null, departmentId: null },
        ...(scope.departmentId ? [{ classId: null, departmentId: scope.departmentId }] : []),
        ...(scope.classId ? [{ classId: scope.classId }] : []),
      ],
    },
  });
  return !!grant;
}
