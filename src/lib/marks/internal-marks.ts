/**
 * Generic internal-marks calculator (Section 34) — deliberately not
 * hard-coded to R2022's specific numbers. Each "group" (CAT, Class Test,
 * Assignment, MCQ, or whatever a different regulation defines) contributes
 * its configured weightage by: averaging every component's own
 * percentage-of-max within the group, then scaling that average to the
 * group's weightage. For a single-component group (e.g. one MCQ test out
 * of 30 scaled to 10), this reduces to exactly `raw/max * weightage`.
 */

export interface ComponentMark {
  id: string;
  groupKey: string;
  maxMarks: number;
  /** null when entryStatus is ABSENT — treated as 0 marks obtained. */
  marksObtained: number | null;
  /** id of the component this one retests, or null if it isn't a retest. */
  isRetestFor: string | null;
}

export interface AssessmentGroupRule {
  groupKey: string;
  weightage: number;
}

export interface GroupBreakdown {
  groupKey: string;
  percentage: number; // 0-100, average across the group's effective components
  mark: number; // percentage/100 * weightage
}

export interface InternalMarksResult {
  totalRaw: number; // unrounded sum of every group's mark
  breakdown: GroupBreakdown[];
}

/**
 * Section 34's CAT rule: "if a student is absent or fails CAT 1 or CAT 2, a
 * retest is held for that specific CAT only, and the retest mark replaces
 * the original." Generalized: any component with a retest recorded against
 * it is replaced by that retest's mark; a component with no retest (e.g.
 * CAT 3, which "has no retest") is used as-is.
 */
function resolveEffectiveComponents(components: ComponentMark[]): ComponentMark[] {
  const retestByOriginal = new Map<string, ComponentMark>();
  for (const c of components) {
    if (c.isRetestFor) retestByOriginal.set(c.isRetestFor, c);
  }
  return components
    .filter((c) => !c.isRetestFor)
    .map((original) => retestByOriginal.get(original.id) ?? original);
}

function componentPercentage(c: ComponentMark): number {
  if (c.maxMarks <= 0) return 0;
  return ((c.marksObtained ?? 0) / c.maxMarks) * 100;
}

export function calculateInternalMarks(
  components: ComponentMark[],
  rules: AssessmentGroupRule[]
): InternalMarksResult {
  const byGroup = new Map<string, ComponentMark[]>();
  for (const c of components) {
    const list = byGroup.get(c.groupKey) ?? [];
    list.push(c);
    byGroup.set(c.groupKey, list);
  }

  const breakdown: GroupBreakdown[] = [];
  let totalRaw = 0;

  for (const rule of rules) {
    const groupComponents = resolveEffectiveComponents(byGroup.get(rule.groupKey) ?? []);
    if (groupComponents.length === 0) {
      breakdown.push({ groupKey: rule.groupKey, percentage: 0, mark: 0 });
      continue;
    }
    const avgPercentage =
      groupComponents.reduce((sum, c) => sum + componentPercentage(c), 0) / groupComponents.length;
    const mark = (avgPercentage / 100) * rule.weightage;
    totalRaw += mark;
    breakdown.push({ groupKey: rule.groupKey, percentage: avgPercentage, mark });
  }

  return { totalRaw, breakdown };
}

export type RoundingRule = "NEAREST_INTEGER" | "NONE";

/** Section 34: "Round the final internal mark ... and store the unrounded
 * value alongside it for audit purposes" — this only ever produces the
 * rounded figure; callers keep totalRaw separately. */
export function roundMark(value: number, rule: RoundingRule): number {
  return rule === "NEAREST_INTEGER" ? Math.round(value) : value;
}
