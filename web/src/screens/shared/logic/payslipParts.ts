import type { ChartColor } from "@/components/charts/chart.types";
import type { Payslip } from "@/api/types.generated";

/** One named amount on a payslip: a pay line, a deduction or an employer contribution. */
export interface Part {
  key: string;
  label: string;
  value: number;
}

type Translate = (key: string) => string;
type NameOf = (code: string) => string;

const n = (v: string | null | undefined) => Number(v ?? 0);

/** Cash pay lines; together they make up gross pay. */
export function earningParts(p: Payslip, nameOf: NameOf): Part[] {
  return p.lines
    .filter((l) => l.kind === "earning")
    .map((l) => ({ key: `line:${l.code}`, label: nameOf(l.code), value: n(l.amount) }));
}

/** What the employer pays on top of gross pay. Earnings plus these equal the employer cost. */
export function employerParts(p: Payslip, t: Translate): Part[] {
  return [
    { key: "employer:bl", label: t("parts.blEmployer"), value: n(p.national_insurance.bl_employer) },
    { key: "employer:pension", label: t("parts.pensionEmployer"), value: n(p.contributions.pension_employer) },
    { key: "employer:severance", label: t("parts.severance"), value: n(p.contributions.severance_employer) },
    { key: "employer:study", label: t("parts.studyEmployer"), value: n(p.contributions.study_fund_employer) },
  ];
}

/** What comes off gross pay. Gross minus these equals net pay. */
export function deductionParts(p: Payslip, t: Translate, nameOf: NameOf): Part[] {
  return [
    { key: "ded:tax", label: t("parts.incomeTax"), value: n(p.income_tax.tax) },
    { key: "ded:bl", label: t("parts.blEmployee"), value: n(p.national_insurance.bl_employee) },
    { key: "ded:health", label: t("parts.health"), value: n(p.national_insurance.health_employee) },
    { key: "ded:pension", label: t("parts.pensionEmployee"), value: n(p.contributions.pension_employee) },
    { key: "ded:study", label: t("parts.studyEmployee"), value: n(p.contributions.study_fund_employee) },
    ...p.deductions.map((d) => ({ key: `ded:${d.code}`, label: nameOf(d.code), value: n(d.applied) })),
  ];
}

/** Add up parts with the same key, keeping first-seen order. */
export function sumParts(lists: Part[][]): Part[] {
  const out = new Map<string, Part>();
  for (const list of lists)
    for (const part of list) {
      const cur = out.get(part.key);
      out.set(part.key, cur ? { ...cur, value: cur.value + part.value } : { ...part });
    }
  return [...out.values()];
}

/** A stable chart color for each key, in the order given. */
export function colorsFor(keys: string[]): Map<string, ChartColor> {
  return new Map(keys.map((k, i) => [k, ((i % 10) + 1) as ChartColor]));
}
