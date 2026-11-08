import type { CompanySummary } from "@/api/types.generated";

/** Where a company's month stands with its payslips. The full status list comes later. */
export function payrollStatus(c: Pick<CompanySummary, "status" | "production">) {
  const { expected, produced, sent } = c.production;
  if (c.status === "approved") return { tone: "success", key: "closed", icon: "lock" } as const;
  if (expected > 0 && sent === expected) return { tone: "success", key: "sent", icon: "check-circle" } as const;
  if (produced > 0) return { tone: "warning", key: "inProgress", icon: "hourglass" } as const;
  return { tone: "neutral", key: "notStarted", icon: "dot" } as const;
}

/** The share of the month's payslips produced so far, 0 to 1. */
export function producedShare(c: Pick<CompanySummary, "production">) {
  const { expected, produced } = c.production;
  return expected ? produced / expected : 0;
}
