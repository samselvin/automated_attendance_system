/**
 * Section 34. SGPA reflects what was actually declared for that semester's
 * exam sitting (attempt 1, even if it was a fail) — it is a historical
 * snapshot and is never recalculated later. CGPA is the cumulative,
 * current-standing figure and explicitly uses "the latest passing attempt
 * for re-appeared (arrear) subjects" — so a cleared arrear updates CGPA but
 * never rewrites the SGPA of the semester it was originally failed in.
 */

export interface SubjectResult {
  subjectId: string;
  attemptNumber: number;
  credits: number;
  gradePoint: number;
  isPass: boolean;
}

export function calculateWeightedGpa(results: Array<{ credits: number; gradePoint: number }>): number {
  const totalCredits = results.reduce((sum, r) => sum + r.credits, 0);
  if (totalCredits === 0) return 0;
  const weighted = results.reduce((sum, r) => sum + r.credits * r.gradePoint, 0);
  return weighted / totalCredits;
}

/** SGPA: exactly the results for one semester, using only the first
 * attempt (Section 34 — see the module note above for why). */
export function calculateSgpa(semesterResults: SubjectResult[]): number {
  const firstAttempts = semesterResults.filter((r) => r.attemptNumber === 1);
  return calculateWeightedGpa(firstAttempts);
}

/** CGPA: across every semester's results, one row per subject — the latest
 * passing attempt if the subject has ever been passed, otherwise the
 * latest attempt on record (still an arrear, still pulling the CGPA down
 * until cleared). */
export function selectEffectiveAttempts(allResults: SubjectResult[]): SubjectResult[] {
  const bySubject = new Map<string, SubjectResult[]>();
  for (const r of allResults) {
    const list = bySubject.get(r.subjectId) ?? [];
    list.push(r);
    bySubject.set(r.subjectId, list);
  }

  const effective: SubjectResult[] = [];
  for (const attempts of bySubject.values()) {
    const passing = attempts.filter((a) => a.isPass).sort((a, b) => b.attemptNumber - a.attemptNumber);
    if (passing.length > 0) {
      effective.push(passing[0]);
    } else {
      const latest = [...attempts].sort((a, b) => b.attemptNumber - a.attemptNumber)[0];
      effective.push(latest);
    }
  }
  return effective;
}

export function calculateCgpa(allResults: SubjectResult[]): number {
  return calculateWeightedGpa(selectEffectiveAttempts(allResults));
}
