import type { Allowances, Component, Deduction, LeaveInputs, MonthEntry, PayLine } from "@/api/types.generated";
import { canEnter } from "@/screens/shared/logic/entryEditing";

/** A line as the editors show it: pay lines and deductions alike. */
export interface DraftLine {
  code: string;
  amount: string;
  quantity?: string | null;
  rate?: string | null;
}

export type LineKind = "earning" | "benefit" | "deduction";

const DEDUCTION_PRIORITY = 20;

/** Components of one kind that people may type in. */
export const enterable = (catalog: Component[], kind: LineKind) =>
  catalog.filter((c) => canEnter(c) && c.kind === kind);

/** The lines of one kind typed this month. */
export function linesOf(entry: MonthEntry, kind: LineKind, catalog: Component[]): DraftLine[] {
  if (kind === "deduction") return (entry.deductions ?? []).map((d) => ({ code: d.code, amount: d.amount }));
  const kindOf = new Map(catalog.map((c) => [c.code, c.kind]));
  return (entry.lines ?? []).filter((l) => (kindOf.get(l.code) ?? "earning") === kind);
}

/** The entry with one kind's lines replaced; the other kinds are kept as they were. */
export function withLines(entry: MonthEntry, kind: LineKind, lines: DraftLine[], catalog: Component[]): MonthEntry {
  if (kind === "deduction") {
    const priority = new Map((entry.deductions ?? []).map((d) => [d.code, d.priority]));
    const deductions: Deduction[] = lines.map((l) => ({
      code: l.code,
      amount: l.amount,
      priority: priority.get(l.code) ?? DEDUCTION_PRIORITY,
    }));
    return { ...entry, deductions };
  }
  const kindOf = new Map(catalog.map((c) => [c.code, c.kind]));
  const others = (entry.lines ?? []).filter((l) => (kindOf.get(l.code) ?? "earning") !== kind);
  const typed: PayLine[] = lines.map((l) => ({
    code: l.code,
    amount: l.amount,
    quantity: l.quantity ?? null,
    rate: l.rate ?? null,
  }));
  return { ...entry, lines: [...others, ...typed] };
}

export const withLeave = (entry: MonthEntry, patch: Partial<LeaveInputs>): MonthEntry => ({
  ...entry,
  leave: { ...(entry.leave ?? {}), ...patch },
});

export const withAllowances = (entry: MonthEntry, patch: Partial<Allowances>): MonthEntry => ({
  ...entry,
  allowances: { ...(entry.allowances ?? {}), ...patch },
});

/** Hours typed as one monthly total replace a day-by-day timesheet. */
export const withHours = (entry: MonthEntry, hours: string | null): MonthEntry => ({
  ...entry,
  timesheet: [],
  hours_total: hours,
});

/** Sick days typed as a count replace dated sick days. */
export const withSickDays = (entry: MonthEntry, days: string | null): MonthEntry => ({
  ...entry,
  sick_days_count: days === null ? null : Math.round(Number(days)),
  leave: { ...(entry.leave ?? {}), sick_days: [] },
});

export const sickCount = (entry: MonthEntry) => entry.sick_days_count ?? entry.leave?.sick_days?.length ?? 0;

/** Two entries are the same when they would save the same data. */
export const sameEntry = (a: MonthEntry, b: MonthEntry) => JSON.stringify(a) === JSON.stringify(b);
