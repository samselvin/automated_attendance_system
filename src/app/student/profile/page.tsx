import { requireRolePage } from "@/lib/guards";
import { TopBar } from "@/components/top-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { getMyStudentProfile } from "@/server/services/student-self.service";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}

export default async function StudentProfilePage() {
  const session = await requireRolePage("STUDENT");
  const { student, enrollment, advisorPosting } = await getMyStudentProfile(session);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Profile" />
      <main className="flex-1 space-y-4 p-4">
        <Card>
          <CardHeader title={student.fullName} subtitle={student.rollNumber} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Register number" value={student.registerNumber} />
            <Field label="College email" value={student.user.email} />
            <Field label="Date of birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : null} />
            <Field label="Mobile" value={student.mobileNumber} />
            <Field label="Address" value={student.address} />
            <Field label="Department" value={student.department.name} />
            <Field label="Batch" value={student.batchLabel} />
            <Field label="Regulation" value={student.regulation.name} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Enrollment" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Academic year" value={enrollment?.class.academicYear.label} />
            <Field label="Year of study" value={enrollment ? String(enrollment.class.yearOfStudy) : null} />
            <Field label="Class" value={enrollment ? `${enrollment.class.yearOfStudy}-${enrollment.class.section}` : null} />
            <Field label="Semester" value={enrollment ? `Semester ${enrollment.semester.number}` : null} />
            <Field label="Class Advisor" value={advisorPosting?.teacher.fullName} />
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Spotted an error in your official details? Contact your Class Advisor or the college office to correct it.
        </p>
      </main>
    </div>
  );
}
