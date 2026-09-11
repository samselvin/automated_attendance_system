import { describe, expect, it } from "vitest";
import { validateTeacherRow, validateStudentRow } from "@/lib/import/validators";
import { parseCsvText, applyColumnMapping } from "@/lib/import/csv";

describe("validateTeacherRow", () => {
  it("accepts a complete row", () => {
    const result = validateTeacherRow({
      email: "Rajesh@PSNCET.ac.in",
      employeeId: "EMP001",
      fullName: "Rajesh Kumar",
      departmentCode: "aids",
    });
    expect(result.errors).toEqual([]);
    expect(result.normalized).toMatchObject({
      email: "rajesh@psncet.ac.in",
      employeeId: "EMP001",
      departmentCode: "AIDS",
    });
  });

  it("collects every missing required field", () => {
    const result = validateTeacherRow({});
    expect(result.normalized).toBeNull();
    expect(result.errors).toContain("email is required");
    expect(result.errors).toContain("employeeId is required");
    expect(result.errors).toContain("fullName is required");
    expect(result.errors).toContain("departmentCode is required");
  });

  it("rejects a malformed email", () => {
    const result = validateTeacherRow({
      email: "not-an-email",
      employeeId: "EMP002",
      fullName: "Someone",
      departmentCode: "AIDS",
    });
    expect(result.errors).toContain("email is not a valid address");
  });
});

describe("validateStudentRow", () => {
  const validRow = {
    email: "student@psncet.ac.in",
    rollNumber: "23AIDS001",
    fullName: "D. SamSelvin",
    departmentCode: "AIDS",
    regulationCode: "R2022",
    batchLabel: "2025-2029",
    academicYearLabel: "2026-2027",
    yearOfStudy: "2",
    section: "A",
    semesterNumber: "3",
    effectiveFrom: "2026-06-01",
    parentName: "Parent Name",
    parentRelationship: "Father",
    parentMobile: "9999999999",
  };

  it("accepts a complete row", () => {
    const result = validateStudentRow(validRow);
    expect(result.errors).toEqual([]);
    expect(result.normalized).toMatchObject({
      rollNumber: "23AIDS001",
      yearOfStudy: 2,
      semesterNumber: 3,
      admissionType: "REGULAR",
    });
  });

  it("rejects an out-of-range yearOfStudy", () => {
    const result = validateStudentRow({ ...validRow, yearOfStudy: "5" });
    expect(result.errors).toContain("yearOfStudy must be an integer 1-4");
  });

  it("rejects a malformed batchLabel", () => {
    const result = validateStudentRow({ ...validRow, batchLabel: "2025" });
    expect(result.errors).toContain("batchLabel must be e.g. 2025-2029");
  });

  it("requires at least one parent contact field set", () => {
    const result = validateStudentRow({ ...validRow, parentMobile: "" });
    expect(result.errors).toContain("parentMobile is required");
  });
});

describe("parseCsvText", () => {
  it("parses headers and rows", () => {
    const csv = "email,rollNumber\nfoo@x.com,23AIDS001\nbar@x.com,23AIDS002\n";
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["email", "rollNumber"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ email: "foo@x.com", rollNumber: "23AIDS001" });
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'name,note\n"Doe, Jane","has, comma"\n';
    const { rows } = parseCsvText(csv);
    expect(rows[0]).toEqual({ name: "Doe, Jane", note: "has, comma" });
  });

  it("returns empty result for empty input", () => {
    expect(parseCsvText("")).toEqual({ headers: [], rows: [] });
  });
});

describe("applyColumnMapping", () => {
  it("remaps source headers to target field names", () => {
    const mapped = applyColumnMapping(
      { "Email Address": "a@b.com", "Roll No": "23AIDS001" },
      { email: "Email Address", rollNumber: "Roll No" }
    );
    expect(mapped).toEqual({ email: "a@b.com", rollNumber: "23AIDS001" });
  });
});
