import type { Component, Deduction, EmployeeRecord, MonthEntry, PayLine } from "@/api/types.generated";

/**
 * What a cell of the salary-month grid edits: a simple monthly total, or any pay component
 * ("line:BONUS"). Values are decimal strings; null means empty.
 */
export type SimpleField = "hours" | "sick" | "vacation" | "absence" | "travel";
export type EntryField = SimpleField | `line:${string}`;

export const SIMPLE_FIELDS: SimpleField[] = ["hours", "sick", "vacation", "absence", "travel"];

/** Lines the engine works out by itself: typing them in would count them twice. */
const CALCULATED = new Set([
  "BASE_SALARY",
  "HOURLY_PAY",
  "UNPAID_ABSENCE",
  "VACATION_PAY",
  "SICK_PAY",
  "SICK_DEDUCTION",
  "HOLIDAY_PAY",
  "RESERVE_DUTY_PAY",
  "TRAVEL",
  "RECUPERATION",
  "CAR_BENEFIT",
  "PHONE_BENEFIT",
  "PENSION_IMPUTED",
  "SEVERANCE_IMPUTED",
  "STUDY_FUND_IMPUTED",
]);

/** Components people can enter by hand. */
export const canEnter = (c: Component) => c.active && !CALCULATED.has(c.code);

const DEFAULT_PRIORITY = 20;

const codeOf = (field: EntryField) => (field.startsWith("line:") ? field.slice(5) : null);

const nonZero = (v: string | null | undefined) => (v && Number(v) !== 0 ? String(v) : null);

export function hoursOf(entry: MonthEntry): number {
  if (entry.hours_total !== null && entry.hours_total !== undefined) return Number(entry.hours_total);
  return (entry.timesheet ?? []).reduce((a, d) => a + Number(d.hours), 0);
}

function sickOf(entry: MonthEntry): number {
  return entry.sick_days_count ?? entry.leave?.sick_days?.length ?? 0;
}

function sumAmounts(items: { code: string; amount: string }[], code: string): string | null {
  const found = items.filter((x) => x.code === code);
  return found.length ? String(found.reduce((a, x) => a + Number(x.amount), 0)) : null;
}

/** The value typed this month, if any. */
export function readTyped(entry: MonthEntry, field: EntryField): string | null {
  const code = codeOf(field);
  if (code) return sumAmounts(entry.lines ?? [], code) ?? sumAmounts(entry.deductions ?? [], code);
  switch (field) {
    case "hours":
      return nonZero(String(hoursOf(entry)));
    case "sick":
      return nonZero(String(sickOf(entry)));
    case "vacation":
      return nonZero(entry.leave?.vacation_days_used);
    case "absence":
      return nonZero(entry.leave?.unpaid_absence_days);
    default:
      return nonZero(entry.allowances?.travel_daily_cost);
  }
}

/** What the cell shows: this month's value, or else the employee's standing amount. */
export function readField(entry: MonthEntry, record: EmployeeRecord, field: EntryField): string | null {
  const typed = readTyped(entry, field);
  if (typed !== null) return typed;
  const code = codeOf(field);
  return (code && record.standing?.find((x) => x.code === code)?.amount) || null;
}

/** A new entry with one field replaced. Clearing a component returns it to the standing amount. */
export function writeField(
  entry: MonthEntry,
  record: EmployeeRecord,
  field: EntryField,
  value: string | null,
  isDeduction: boolean,
): MonthEntry {
  const code = codeOf(field);
  if (code) {
    // Zero is kept only when it has a meaning: skipping a standing amount this month.
    const standing = record.standing?.some((x) => x.code === code);
    const keep = value !== null && (Number(value) !== 0 || standing);
    if (isDeduction) {
      const others = (entry.deductions ?? []).filter((d) => d.code !== code);
      const deductions: Deduction[] = keep ? [...others, { code, amount: value, priority: DEFAULT_PRIORITY }] : others;
      return { ...entry, deductions };
    }
    const others = (entry.lines ?? []).filter((l) => l.code !== code);
    const lines: PayLine[] = keep ? [...others, { code, amount: value }] : others;
    return { ...entry, lines };
  }
  const leave = entry.leave ?? {};
  switch (field) {
    case "hours":
      return { ...entry, timesheet: [], hours_total: value };
    case "sick":
      return {
        ...entry,
        leave: { ...leave, sick_days: [] },
        sick_days_count: value === null ? null : Math.round(Number(value)),
      };
    case "vacation":
      return { ...entry, leave: { ...leave, vacation_days_used: value ?? "0" } };
    case "absence":
      return { ...entry, leave: { ...leave, unpaid_absence_days: value ?? "0" } };
    default:
      return { ...entry, allowances: { ...(entry.allowances ?? {}), travel_daily_cost: value } };
  }
}
