"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useRules } from "@/api/queries";
import type { RuleEntry, TraceEntry } from "@/api/types.generated";
import { ruleNameKey } from "@/screens/shared/logic/flags";

/** Which rule files each kind of explanation draws on, so the panel can cite the law. */
const SOURCES: Record<string, string[]> = {
  "income_tax.withholding": [
    "income_tax.brackets",
    "income_tax.surtax",
    "income_tax.credit_point_value",
    "income_tax.credit_points",
    "income_tax.pension_credit",
    "income_tax.secondary_job",
  ],
  "national_insurance.employee": ["national_insurance.thresholds", "national_insurance.rates", "national_insurance.ages"],
  "national_insurance.employer": ["national_insurance.thresholds", "national_insurance.rates"],
  "pension.employee": ["pension.mandatory"],
  "pension.employer": ["pension.mandatory"],
  "pension.severance": ["pension.mandatory"],
  "pension.study_fund": ["pension.study_fund"],
  "leave.vacation_accrual": ["labor.vacation"],
  "leave.reserve_duty": ["labor.reserve_duty"],
  "line.TRAVEL": ["labor.travel"],
  "line.RECUPERATION": ["labor.recuperation"],
  "line.OVERTIME_125": ["labor.hours"],
  "line.OVERTIME_150": ["labor.hours"],
  "line.REST_DAY_150": ["labor.hours", "calendar.holidays"],
  "line.REST_DAY_175": ["labor.hours", "calendar.holidays"],
  "line.REST_DAY_200": ["labor.hours", "calendar.holidays"],
  "line.HOURLY_PAY": ["labor.hours"],
  "line.SICK_PAY": ["labor.sick_leave"],
  "line.SICK_DEDUCTION": ["labor.sick_leave"],
  "line.HOLIDAY_PAY": ["labor.holidays", "calendar.holidays"],
  "line.CAR_BENEFIT": ["benefits.car"],
  "line.PHONE_BENEFIT": ["benefits.phone"],
  "line.PENSION_IMPUTED": ["pension.employer_exemption"],
  "line.SEVERANCE_IMPUTED": ["pension.employer_exemption"],
  "line.STUDY_FUND_IMPUTED": ["pension.study_fund"],
  "line.BASE_SALARY": ["calendar.holidays"],
};

export interface ExplainTarget {
  entry: TraceEntry;
  title: string;
  /** Pay-period date the payslip was calculated for, to pick the rule versions in force. */
  on: string;
  /** Most results are money; accruals are counted in days. */
  unit?: "money" | "days";
}

function inForce(entry: RuleEntry, on: string) {
  return entry.effective_from <= on && (entry.effective_to == null || on <= entry.effective_to);
}

export function useExplain() {
  const t = useTranslations();
  const rules = useRules();
  const [target, setTarget] = useState<ExplainTarget | null>(null);

  const sources = useMemo(() => {
    if (!target) return [];
    const ids = SOURCES[target.entry.rule_id] ?? [];
    return ids
      .map((id) => (rules.data ?? []).find((r) => r.rule_id === id && inForce(r, target.on)))
      .filter((r): r is RuleEntry => !!r)
      .map((r) => ({
        id: r.rule_id,
        title: t.has(ruleNameKey(r.rule_id)) ? t(ruleNameKey(r.rule_id)) : r.rule_id,
        source: r.source,
        verified: r.verified ?? false,
        from: r.effective_from,
        to: r.effective_to ?? null,
      }));
  }, [target, rules.data, t]);

  const inputLabel = (name: string) => (t.has(`explain.inputs.${name}`) ? t(`explain.inputs.${name}`) : name);

  return {
    t,
    target,
    open: (next: ExplainTarget) => setTarget(next),
    close: () => setTarget(null),
    sources,
    inputs: (target?.entry.inputs ?? []).map(([name, value]) => ({ key: name, label: inputLabel(name), value })),
  };
}

export type ExplainState = ReturnType<typeof useExplain>;
