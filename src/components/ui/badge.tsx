const VARIANTS = {
  safe: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  critical: "bg-red-50 text-red-700 ring-red-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
  info: "bg-blue-50 text-blue-700 ring-blue-600/20",
} as const;

export type BadgeVariant = keyof typeof VARIANTS;

/** Section 32: never color alone — every badge carries a text label. */
export function Badge({ label, variant = "neutral" }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${VARIANTS[variant]}`}>
      {label}
    </span>
  );
}

export function attendanceLevelVariant(level: "SAFE" | "WARNING" | "CRITICAL"): BadgeVariant {
  if (level === "SAFE") return "safe";
  if (level === "WARNING") return "warning";
  return "critical";
}

export function statusVariant(status: string): BadgeVariant {
  const s = status.toUpperCase();
  if (["APPROVED", "SENT", "DELIVERED", "HELD", "PRESENT", "PASS", "CONFIRMED"].includes(s)) return "safe";
  if (["PENDING", "SCHEDULED", "QUEUED", "NOT_STARTED"].includes(s)) return "warning";
  if (["REJECTED", "FAILED", "CANCELLED", "ABSENT"].includes(s)) return "critical";
  return "neutral";
}
