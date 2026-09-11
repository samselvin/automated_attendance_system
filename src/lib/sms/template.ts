/** Simple {var} substitution — the SMS provider's DLT template must match
 * this text exactly (Section 33), so keep it a plain fill-in, no logic. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

export const DEFAULT_FIRST_HOUR_ABSENCE_TEMPLATE =
  "Dear Parent, your ward {student_name} ({roll_number}) was marked absent in the first hour on {date}. - {college_name}";

export function buildDedupeKey(studentId: string, dateISO: string, messageType: string): string {
  return `${studentId}:${dateISO}:${messageType}`;
}
