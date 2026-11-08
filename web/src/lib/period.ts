import type { Period } from "@/api/types.generated";

export function periodKey(p: Period): string {
  return `${p.year}-${String(p.month).padStart(2, "0")}`;
}

export function parsePeriod(key: string | undefined): Period | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key ?? "");
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year: Number(match[1]), month } : null;
}

export function shiftPeriod(p: Period, months: number): Period {
  const index = p.year * 12 + (p.month - 1) + months;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function lastDay(p: Period): string {
  const day = new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
  return `${periodKey(p)}-${String(day).padStart(2, "0")}`;
}

/** The month payroll is usually run for: the previous calendar month. */
export function defaultPeriod(today = new Date()): Period {
  return shiftPeriod({ year: today.getFullYear(), month: today.getMonth() + 1 }, -1);
}
