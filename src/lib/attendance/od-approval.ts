export type ApproverDecision = "PENDING" | "APPROVED" | "REJECTED" | null;

/**
 * Section 30: ON_DUTY requires BOTH the Class Advisor and the HOD to
 * approve, in either order. Either one rejecting rejects the whole request
 * immediately, regardless of what the other has decided.
 */
export function computeOdStatus(
  classAdvisorDecision: ApproverDecision,
  hodDecision: ApproverDecision
): "PENDING" | "APPROVED" | "REJECTED" {
  if (classAdvisorDecision === "REJECTED" || hodDecision === "REJECTED") return "REJECTED";
  if (classAdvisorDecision === "APPROVED" && hodDecision === "APPROVED") return "APPROVED";
  return "PENDING";
}
