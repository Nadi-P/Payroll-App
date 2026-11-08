import type { Flag, Payslip } from "@/api/types.generated";

/** Shown once per page as a trust note, not as an issue on every employee. */
export const UNVERIFIED = "UNVERIFIED_RULES";

export const KNOWN_FLAGS = [
  "BELOW_MINIMUM_WAGE",
  "PENSION_MISSING",
  "NO_CREDIT_POINTS",
  "OVERTIME_SPIKE",
  "INSURANCE_CEILING",
  "NEGATIVE_NET",
  "DEDUCTIONS_NOT_APPLIED",
  "TAX_REFUND",
  "VACATION_OVERDRAWN",
] as const;

export function issuesOf(slip: Payslip | undefined): Flag[] {
  const order = { error: 0, warning: 1, info: 2 };
  return (slip?.flags ?? []).filter((f) => f.code !== UNVERIFIED).sort((a, b) => order[a.severity] - order[b.severity]);
}

export function worstSeverity(slip: Payslip | undefined): "error" | "warning" | undefined {
  const issues = issuesOf(slip);
  if (issues.some((f) => f.severity === "error")) return "error";
  if (issues.some((f) => f.severity === "warning")) return "warning";
  return undefined;
}

/** Translation key prefix for a flag; unknown codes fall back to a generic text. */
export function flagKey(code: string): string {
  return (KNOWN_FLAGS as readonly string[]).includes(code) ? `flags.${code}` : "flags.OTHER";
}

/** Translation key for a rule's display name (message keys cannot contain dots). */
export function ruleNameKey(ruleId: string): string {
  return `rules.names.${ruleId.replaceAll(".", "-")}`;
}
