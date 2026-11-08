"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { ChartColor } from "@/components/charts/chart.types";
import type { Payslip } from "@/api/types.generated";
import { formatMoney, formatNumber } from "@/lib/format";
import { lastDay } from "@/lib/period";
import { useComponentNames } from "@/screens/shared/logic/catalogNames";
import { colorsFor, deductionParts, earningParts, sumParts, type Part } from "@/screens/shared/logic/payslipParts";
import { useSelection } from "@/screens/shared/logic/useSelection";

export const METRICS = ["cost", "net", "gross", "tax", "pension", "insurance"] as const;
export type Metric = (typeof METRICS)[number];

const n = (v: string) => Number(v);

const METRIC_OF: Record<Metric, (p: Payslip) => number> = {
  cost: (p) => n(p.employer_cost),
  net: (p) => n(p.net_pay),
  gross: (p) => n(p.bases.gross_cash),
  tax: (p) => n(p.income_tax.tax),
  pension: (p) => n(p.contributions.pension_employee) + n(p.contributions.pension_employer) + n(p.contributions.severance_employer),
  insurance: (p) =>
    n(p.national_insurance.bl_employee) + n(p.national_insurance.bl_employer) + n(p.national_insurance.health_employee),
};

interface Person {
  id: string;
  name: string;
  slip: Payslip;
}

/** The employees screen charts: each person's share of a chosen total, and what adds to / comes off their pay. */
export function useEmployeeCharts(people: Person[]) {
  const t = useTranslations();
  const locale = useLocale();
  const names = useComponentNames(people[0] ? lastDay(people[0].slip.period) : "2026-01-31");
  const [metric, setMetric] = useState<Metric>("cost");
  const shareSel = useSelection();
  const barSel = useSelection();
  const ids = people.map((p) => p.id);
  const colors = colorsFor(ids);

  const options = (sel: ReturnType<typeof useSelection>) => ({
    summary: sel.summary(ids),
    options: people.map((p) => ({ id: p.id, label: p.name, checked: sel.has(p.id), swatch: `var(--chart-${colors.get(p.id)})` })),
    toggle: sel.toggle,
    all: sel.all,
    none: () => sel.none(ids),
  });

  // A negative pay line (e.g. a sick-day deduction) lowers pay, so it is drawn with the deductions.
  const split = (slip: Payslip): { adds: Part[]; deds: Part[] } => {
    const earnings = earningParts(slip, names.name);
    return {
      adds: earnings.filter((x) => x.value > 0),
      deds: [
        ...deductionParts(slip, t, names.name),
        ...earnings.filter((x) => x.value < 0).map((x) => ({ ...x, key: `neg:${x.key}`, value: -x.value })),
      ],
    };
  };
  const barPeople = people.filter((p) => barSel.has(p.id));
  const splits = people.map((p) => split(p.slip));
  const adds = sumParts(splits.map((x) => x.adds)).filter((x) => x.value > 0.005);
  const deds = sumParts(splits.map((x) => x.deds)).filter((x) => x.value > 0.005);
  const partColors = colorsFor([...adds, ...deds].map((x) => x.key));

  return {
    metric,
    setMetric,
    metricOptions: METRICS.map((m) => ({ value: m, label: t(`employees.metrics.${m}`) })),
    share: {
      slices: people
        .filter((p) => shareSel.has(p.id))
        .map((p) => ({ key: p.id, label: p.name, value: METRIC_OF[metric](p.slip), color: colors.get(p.id) as ChartColor })),
      ...options(shareSel),
    },
    bars: {
      ...options(barSel),
      data: barPeople.map((p) => {
        const row: { label: string } & Record<string, string | number> = { label: p.name };
        const parts = split(p.slip);
        for (const part of [...parts.adds, ...parts.deds]) row[part.key] = Number(row[part.key] ?? 0) + part.value;
        return row;
      }),
      series: [
        ...adds.map((x) => ({ key: x.key, label: x.label, color: partColors.get(x.key)!, stack: "add", stackLabel: t("employees.charts.adds") })),
        ...deds.map((x) => ({ key: x.key, label: x.label, color: partColors.get(x.key)!, stack: "ded", stackLabel: t("employees.charts.deducts") })),
      ],
    },
    money: (v: number) => formatMoney(v, locale),
    moneyCompact: (v: number) => formatMoney(v, locale, { compact: true }),
    percent: (share: number) => `${formatNumber(share * 100, locale, 1)}%`,
  };
}
