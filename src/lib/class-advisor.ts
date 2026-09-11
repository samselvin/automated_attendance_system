import { prisma } from "@/lib/prisma";

/**
 * Class Advisor is a posting-derived permission (Section 11-12), not a
 * stored role: a teacher has it only while an active posting covers today.
 */
export async function getActiveAdvisorClassIds(teacherId: string, asOf: Date = new Date()): Promise<string[]> {
  const postings = await prisma.classAdvisorPosting.findMany({
    where: {
      teacherId,
      status: "ACTIVE",
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
    },
    select: { classId: true },
  });
  return postings.map((p) => p.classId);
}

export async function isActiveClassAdvisor(
  teacherId: string,
  classId: string,
  asOf: Date = new Date()
): Promise<boolean> {
  const count = await prisma.classAdvisorPosting.count({
    where: {
      teacherId,
      classId,
      status: "ACTIVE",
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
    },
  });
  return count > 0;
}
