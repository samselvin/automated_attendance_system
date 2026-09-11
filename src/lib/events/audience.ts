/**
 * Section 36: "Students see only events relevant to them." Pure predicate
 * so the filtering logic is one tested place, not duplicated across the
 * student list endpoint and anywhere else that needs the same answer.
 */

export type EventAudienceType = "COLLEGE" | "DEPARTMENT" | "YEAR" | "CLASS" | "GROUP";

export interface EventAudience {
  audienceType: EventAudienceType;
  departmentId: string | null;
  yearOfStudy: number | null;
  classId: string | null;
  studentGroupId: string | null;
}

export interface StudentEventContext {
  departmentId: string;
  yearOfStudy: number | null;
  classId: string | null;
  groupIds: string[];
}

export function eventAppliesToStudent(event: EventAudience, student: StudentEventContext): boolean {
  switch (event.audienceType) {
    case "COLLEGE":
      return true;
    case "DEPARTMENT":
      return event.departmentId === student.departmentId;
    case "YEAR":
      return event.departmentId === student.departmentId && event.yearOfStudy === student.yearOfStudy;
    case "CLASS":
      return !!event.classId && event.classId === student.classId;
    case "GROUP":
      return !!event.studentGroupId && student.groupIds.includes(event.studentGroupId);
  }
}
