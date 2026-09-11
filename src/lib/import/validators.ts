const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_LABEL_RE = /^\d{4}-\d{4}$/;

export interface NormalizedTeacherRow {
  email: string;
  employeeId: string;
  fullName: string;
  designation?: string;
  departmentCode: string;
  mobileNumber?: string;
}

export interface NormalizedStudentRow {
  email: string;
  rollNumber: string;
  registerNumber?: string;
  fullName: string;
  dateOfBirth?: string;
  departmentCode: string;
  regulationCode: string;
  batchLabel: string;
  admissionType: "REGULAR" | "LATERAL_ENTRY";
  academicYearLabel: string;
  yearOfStudy: number;
  section: string;
  semesterNumber: number;
  effectiveFrom: string;
  parentName: string;
  parentRelationship: string;
  parentMobile: string;
}

export interface RowValidationResult<T> {
  errors: string[];
  normalized: T | null;
}

export function validateTeacherRow(raw: Record<string, string>): RowValidationResult<NormalizedTeacherRow> {
  const errors: string[] = [];

  const email = (raw.email ?? "").trim().toLowerCase();
  if (!email) errors.push("email is required");
  else if (!EMAIL_RE.test(email)) errors.push("email is not a valid address");

  const employeeId = (raw.employeeId ?? "").trim();
  if (!employeeId) errors.push("employeeId is required");

  const fullName = (raw.fullName ?? "").trim();
  if (!fullName) errors.push("fullName is required");

  const departmentCode = (raw.departmentCode ?? "").trim().toUpperCase();
  if (!departmentCode) errors.push("departmentCode is required");

  if (errors.length > 0) return { errors, normalized: null };

  return {
    errors,
    normalized: {
      email,
      employeeId,
      fullName,
      designation: raw.designation?.trim() || undefined,
      departmentCode,
      mobileNumber: raw.mobileNumber?.trim() || undefined,
    },
  };
}

export function validateStudentRow(raw: Record<string, string>): RowValidationResult<NormalizedStudentRow> {
  const errors: string[] = [];

  const email = (raw.email ?? "").trim().toLowerCase();
  if (!email) errors.push("email is required");
  else if (!EMAIL_RE.test(email)) errors.push("email is not a valid address");

  const rollNumber = (raw.rollNumber ?? "").trim();
  if (!rollNumber) errors.push("rollNumber is required");

  const fullName = (raw.fullName ?? "").trim();
  if (!fullName) errors.push("fullName is required");

  const dateOfBirth = raw.dateOfBirth?.trim();
  if (dateOfBirth && !DATE_RE.test(dateOfBirth)) errors.push("dateOfBirth must be YYYY-MM-DD");

  const departmentCode = (raw.departmentCode ?? "").trim().toUpperCase();
  if (!departmentCode) errors.push("departmentCode is required");

  const regulationCode = (raw.regulationCode ?? "").trim().toUpperCase();
  if (!regulationCode) errors.push("regulationCode is required");

  const batchLabel = (raw.batchLabel ?? "").trim();
  if (!batchLabel) errors.push("batchLabel is required");
  else if (!YEAR_LABEL_RE.test(batchLabel)) errors.push("batchLabel must be e.g. 2025-2029");

  const admissionTypeRaw = (raw.admissionType ?? "REGULAR").trim().toUpperCase();
  if (admissionTypeRaw !== "REGULAR" && admissionTypeRaw !== "LATERAL_ENTRY") {
    errors.push("admissionType must be REGULAR or LATERAL_ENTRY");
  }

  const academicYearLabel = (raw.academicYearLabel ?? "").trim();
  if (!academicYearLabel) errors.push("academicYearLabel is required");
  else if (!YEAR_LABEL_RE.test(academicYearLabel)) errors.push("academicYearLabel must be e.g. 2026-2027");

  const yearOfStudy = Number(raw.yearOfStudy);
  if (!raw.yearOfStudy) errors.push("yearOfStudy is required");
  else if (!Number.isInteger(yearOfStudy) || yearOfStudy < 1 || yearOfStudy > 4) {
    errors.push("yearOfStudy must be an integer 1-4");
  }

  const section = (raw.section ?? "").trim().toUpperCase();
  if (!section) errors.push("section is required");

  const semesterNumber = Number(raw.semesterNumber);
  if (!raw.semesterNumber) errors.push("semesterNumber is required");
  else if (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 8) {
    errors.push("semesterNumber must be an integer 1-8");
  }

  const effectiveFrom = raw.effectiveFrom?.trim();
  if (!effectiveFrom) errors.push("effectiveFrom is required");
  else if (!DATE_RE.test(effectiveFrom)) errors.push("effectiveFrom must be YYYY-MM-DD");

  const parentName = (raw.parentName ?? "").trim();
  if (!parentName) errors.push("parentName is required");
  const parentRelationship = (raw.parentRelationship ?? "").trim();
  if (!parentRelationship) errors.push("parentRelationship is required");
  const parentMobile = (raw.parentMobile ?? "").trim();
  if (!parentMobile) errors.push("parentMobile is required");

  if (errors.length > 0) return { errors, normalized: null };

  return {
    errors,
    normalized: {
      email,
      rollNumber,
      registerNumber: raw.registerNumber?.trim() || undefined,
      fullName,
      dateOfBirth,
      departmentCode,
      regulationCode,
      batchLabel,
      admissionType: admissionTypeRaw as "REGULAR" | "LATERAL_ENTRY",
      academicYearLabel,
      yearOfStudy,
      section,
      semesterNumber,
      effectiveFrom,
      parentName,
      parentRelationship,
      parentMobile,
    },
  };
}
