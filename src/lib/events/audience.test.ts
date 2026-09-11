import { describe, expect, it } from "vitest";
import { eventAppliesToStudent, type EventAudience, type StudentEventContext } from "@/lib/events/audience";

const student: StudentEventContext = {
  departmentId: "dept-aids",
  yearOfStudy: 2,
  classId: "class-2a",
  groupIds: ["group-lab1", "group-elective-ai"],
};

function event(overrides: Partial<EventAudience>): EventAudience {
  return {
    audienceType: "COLLEGE",
    departmentId: null,
    yearOfStudy: null,
    classId: null,
    studentGroupId: null,
    ...overrides,
  };
}

describe("eventAppliesToStudent", () => {
  it("a COLLEGE event applies to every student regardless of scoping fields", () => {
    expect(eventAppliesToStudent(event({ audienceType: "COLLEGE" }), student)).toBe(true);
  });

  it("a DEPARTMENT event applies only to students in that department", () => {
    expect(eventAppliesToStudent(event({ audienceType: "DEPARTMENT", departmentId: "dept-aids" }), student)).toBe(true);
    expect(eventAppliesToStudent(event({ audienceType: "DEPARTMENT", departmentId: "dept-cse" }), student)).toBe(false);
  });

  it("a YEAR event requires both department and year to match", () => {
    expect(eventAppliesToStudent(event({ audienceType: "YEAR", departmentId: "dept-aids", yearOfStudy: 2 }), student)).toBe(true);
    expect(eventAppliesToStudent(event({ audienceType: "YEAR", departmentId: "dept-aids", yearOfStudy: 3 }), student)).toBe(false);
    expect(eventAppliesToStudent(event({ audienceType: "YEAR", departmentId: "dept-cse", yearOfStudy: 2 }), student)).toBe(false);
  });

  it("a CLASS event applies only to students in that exact class", () => {
    expect(eventAppliesToStudent(event({ audienceType: "CLASS", classId: "class-2a" }), student)).toBe(true);
    expect(eventAppliesToStudent(event({ audienceType: "CLASS", classId: "class-2b" }), student)).toBe(false);
  });

  it("a GROUP event applies only to students who are members of that group", () => {
    expect(eventAppliesToStudent(event({ audienceType: "GROUP", studentGroupId: "group-lab1" }), student)).toBe(true);
    expect(eventAppliesToStudent(event({ audienceType: "GROUP", studentGroupId: "group-lab2" }), student)).toBe(false);
  });

  it("a student in no groups never matches a GROUP event", () => {
    const noGroups: StudentEventContext = { ...student, groupIds: [] };
    expect(eventAppliesToStudent(event({ audienceType: "GROUP", studentGroupId: "group-lab1" }), noGroups)).toBe(false);
  });
});
