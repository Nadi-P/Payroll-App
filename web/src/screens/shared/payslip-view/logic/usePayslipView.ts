"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Payslip, TraceEntry } from "@/api/types.generated";
import { formatNumber } from "@/lib/format";
import { lastDay } from "@/lib/period";
import type { ExplainState } from "@/screens/shared/explain-panel/logic/useExplain";
import { issuesOf } from "@/screens/shared/logic/flags";
import { useComponentNames } from "@/screens/shared/logic/catalogNames";

export interface PayslipRow {
  key: string;
  label: string;
  amount: string | number;
  hint?: string;
  total?: boolean;
  negative?: boolean;
  unit?: "money" | "days";
  explain?: () => void;
}

const sum = (...values: (string | undefined | null)[]) => values.reduce((a, v) => a + Number(v ?? 0), 0);

/** Arranges one payslip into the sections people read: earnings, deductions, net, employer side. */
export function usePayslipView(slip: Payslip | undefined, explain: ExplainState) {
  const t = useTranslations();
  const locale = useLocale();
  const on = slip ? lastDay(slip.period) : "2026-01-31";
  const names = useComponentNames(on);

  if (!slip) return { t, ready: false as const };

  const traceOf = (ruleId: string): TraceEntry | undefined =>
    slip.trace.entries.find((e) => e.rule_id === ruleId);
  const explainer = (ruleId: string, title: string, unit?: "money" | "days") => {
    const entry = traceOf(ruleId);
    return entry ? () => explain.open({ entry, title, on, unit }) : undefined;
  };

  const lineRows = (kind: "earning" | "benefit"): PayslipRow[] =>
    slip.lines
      .filter((l) => l.kind === kind)
      .map((l, i) => {
        const label = names.name(l.code);
        return {
          key: `${l.code}-${i}`,
          label,
          amount: l.amount,
          hint: l.quantity && l.rate ? `${formatNumber(l.quantity, locale)} × ${formatNumber(l.rate, locale)}` : undefined,
          explain: explainer(`line.${l.code}`, label),
        };
      });

  const ni = slip.national_insurance;
  const c = slip.contributions;
  const tax = slip.income_tax;

  const deductions: PayslipRow[] = [
    { key: "tax", label: t("payslip.incomeTax"), amount: tax.tax, explain: explainer("income_tax.withholding", t("payslip.incomeTax")) },
    { key: "bl", label: t("payslip.nationalInsurance"), amount: ni.bl_employee, explain: explainer("national_insurance.employee", t("payslip.nationalInsurance")) },
    { key: "health", label: t("payslip.healthTax"), amount: ni.health_employee, explain: explainer("national_insurance.employee", t("payslip.healthTax")) },
    { key: "pension", label: t("payslip.pensionEmployee"), amount: c.pension_employee ?? "0", explain: explainer("pension.employee", t("payslip.pensionEmployee")) },
    { key: "study", label: t("payslip.studyFundEmployee"), amount: c.study_fund_employee ?? "0", explain: explainer("pension.study_fund", t("payslip.studyFundEmployee")) },
    ...slip.deductions.map((d, i) => ({
      key: `ded-${d.code}-${i}`,
      label: names.name(d.code),
      amount: d.applied,
      hint: Number(d.requested) > Number(d.applied) ? t("payslip.partiallyApplied") : undefined,
    })),
  ].filter((r) => Number(r.amount) !== 0);

  const employer: PayslipRow[] = [
    { key: "bl-er", label: t("payslip.employerInsurance"), amount: ni.bl_employer, explain: explainer("national_insurance.employer", t("payslip.employerInsurance")) },
    { key: "pension-er", label: t("payslip.pensionEmployer"), amount: c.pension_employer ?? "0", explain: explainer("pension.employer", t("payslip.pensionEmployer")) },
    { key: "severance-er", label: t("payslip.severanceEmployer"), amount: c.severance_employer ?? "0", explain: explainer("pension.severance", t("payslip.severanceEmployer")) },
    { key: "study-er", label: t("payslip.studyFundEmployer"), amount: c.study_fund_employer ?? "0", explain: explainer("pension.study_fund", t("payslip.studyFundEmployer")) },
  ].filter((r) => Number(r.amount) !== 0);

  const b = slip.balances;
  return {
    t,
    ready: true as const,
    issues: issuesOf(slip),
    earnings: lineRows("earning"),
    benefits: lineRows("benefit"),
    gross: slip.bases.gross_cash,
    deductions,
    deductionsTotal: deductions.reduce((a, r) => a + Number(r.amount), 0),
    net: slip.net_pay,
    explainNet: explainer("net.pay", t("payslip.net")),
    employer,
    cost: slip.employer_cost,
    explainCost: explainer("net.employer_cost", t("payslip.employerCost")),
    tax: [
      { key: "taxable", label: t("payslip.taxable"), amount: tax.taxable },
      { key: "bracket", label: t("payslip.bracketTax"), amount: sum(tax.bracket_tax, tax.surtax) },
      { key: "points", label: t("payslip.creditPoints", { points: Number(tax.credit_points) }), amount: -Number(tax.credit_points_amount) },
      { key: "pcredit", label: t("payslip.pensionCredit"), amount: -Number(tax.pension_credit) },
    ].filter((r) => Number(r.amount) !== 0) as PayslipRow[],
    balances: [
      { key: "vac", label: t("payslip.vacationBalance"), amount: b.vacation ?? "0", unit: "days", explain: explainer("leave.vacation_accrual", t("payslip.vacationBalance"), "days") },
      { key: "sick", label: t("payslip.sickBalance"), amount: b.sick ?? "0", unit: "days" },
    ] as PayslipRow[],
    reserve: Number(b.reserve_duty_reimbursement ?? 0) > 0 ? b.reserve_duty_reimbursement : null,
    insuranceCategory: t(`payslip.categories.${ni.category}`),
    version: slip.ruleset_version,
    unverified: slip.unverified_rules.length,
  };
}
