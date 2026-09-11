import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError } from "@/lib/rbac";
import { NotFoundError } from "@/lib/api-utils";

export async function getMyStudentProfile(session: Session) {
  if (!session.user.studentId) throw new UnauthorizedError("Not a student");

  const student = await prisma.student.findUnique({
    where: { id: session.user.studentId },
    include: {
      department: true,
      regulation: true,
      parentContacts: true,
      user: { select: { email: true } },
    },
  });
  if (!student) throw new NotFoundError("Student profile not found");

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: { studentId: student.id, status: "ACTIVE" },
    orderBy: { effectiveFrom: "desc" },
    include: { class: { include: { academicYear: true } }, semester: true },
  });

  const advisorPosting = enrollment
    ? await prisma.classAdvisorPosting.findFirst({
        where: { classId: enrollment.classId, status: "ACTIVE" },
        include: { teacher: true },
      })
    : null;

  return { student, enrollment, advisorPosting };
}
