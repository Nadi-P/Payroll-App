"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Payslip } from "@/api/types.generated";
import { formatMoney, formatNumber } from "@/lib/format";
import { lastDay } from "@/lib/period";
import { useComponentNames } from "@/screens/shared/logic/catalogNames";
import { colorsFor, earningParts, employerParts, sumParts, type Part } from "@/screens/shared/logic/payslipParts";
import { useSelection } from "@/screens/shared/logic/useSelection";

export interface BreakdownRow {
  id: string;
  name: string;
  slip: Payslip | undefined;
}

/**
 * Employer cost of the chosen employees, split into pay lines and employer contributions.
 * Both the employees and the parts can be filtered.
 */
export function useCostBreakdown(rows: BreakdownRow[]) {
  const t = useTranslations();
  const locale = useLocale();
  const first = rows.find((r) => r.slip)?.slip;
  const names = useComponentNames(first ? lastDay(first.period) : "2026-01-31");
  const people = useSelection();
  const parts = useSelection();

  const partsOf = (slip: Payslip): Part[] => [...earningParts(slip, names.name), ...employerParts(slip, t)];
  const withSlips = rows.filter((r): r is BreakdownRow & { slip: Payslip } => !!r.slip);
  const allParts = sumParts(withSlips.map((r) => partsOf(r.slip))).filter((p) => Math.abs(p.value) > 0.005);
  const colors = colorsFor(allParts.map((p) => p.key));
  const chosen = sumParts(withSlips.filter((r) => people.has(r.id)).map((r) => partsOf(r.slip)));
  const personIds = withSlips.map((r) => r.id);
  const partIds = allParts.map((p) => p.key);

  return {
    t,
    slices: chosen
      .filter((p) => parts.has(p.key) && colors.has(p.key))
      .map((p) => ({ ...p, color: colors.get(p.key)! })),
    people: {
      summary: people.summary(personIds),
      options: withSlips.map((r) => ({ id: r.id, label: r.name, checked: people.has(r.id) })),
      toggle: people.toggle,
      all: people.all,
      none: () => people.none(personIds),
    },
    parts: {
      summary: parts.summary(partIds),
      options: allParts.map((p) => ({
        id: p.key,
        label: p.label,
        checked: parts.has(p.key),
        swatch: `var(--chart-${colors.get(p.key)})`,
      })),
      toggle: parts.toggle,
      all: parts.all,
      none: () => parts.none(partIds),
    },
    money: (v: number) => formatMoney(v, locale),
    percent: (share: number) => `${formatNumber(share * 100, locale, 1)}%`,
  };
}
