import type { Payslip } from "@/api/types.generated";
import type { Part } from "./payslipParts";

/**
 * The five parts of an employee's month: cash payments, imputed income (benefits in kind,
 * zkifot), voluntary deductions, social funds and absences. Statutory deductions (tax and
 * national insurance) are not a section: they follow from the others.
 */
export const SECTIONS = ["payments", "imputed", "deductions", "funds", "absences"] as const;
export type Section = (typeof SECTIONS)[number];

type Translate = (key: string) => string;
type NameOf = (code: string) => string;

const n = (v: string | null | undefined) => Number(v ?? 0);

/** Money sections are in shekels; absences are in days. */
export const sectionUnit = (s: Section): "money" | "days" => (s === "absences" ? "days" : "money");

export function sectionParts(slip: Payslip, section: Section, t: Translate, nameOf: NameOf): Part[] {
  const c = slip.contributions;
  const b = slip.balances;
  switch (section) {
    case "payments":
      return byCode(slip.lines.filter((l) => l.kind === "earning"), nameOf);
    case "imputed":
      return byCode(slip.lines.filter((l) => l.kind === "benefit"), nameOf);
    case "deductions":
      return slip.deductions.map((d) => ({ key: d.code, label: nameOf(d.code), value: n(d.applied) }));
    case "funds":
      return [
        { key: "pensionEmployee", label: t("parts.pensionEmployee"), value: n(c.pension_employee) },
        { key: "pensionEmployer", label: t("parts.pensionEmployer"), value: n(c.pension_employer) },
        { key: "severance", label: t("parts.severance"), value: n(c.severance_employer) },
        { key: "disabilityEmployee", label: t("parts.disabilityEmployee"), value: n(c.disability_employee) },
        { key: "disabilityEmployer", label: t("parts.disabilityEmployer"), value: n(c.disability_employer) },
        { key: "otherEmployee", label: t("parts.otherEmployee"), value: n(c.other_employee) },
        { key: "otherEmployer", label: t("parts.otherEmployer"), value: n(c.other_employer) },
        { key: "studyEmployee", label: t("parts.studyEmployee"), value: n(c.study_fund_employee) },
        { key: "studyEmployer", label: t("parts.studyEmployer"), value: n(c.study_fund_employer) },
      ];
    case "absences":
      return [
        { key: "vacation", label: t("absences.vacation"), value: n(b.vacation_used) },
        { key: "sick", label: t("absences.sick"), value: n(b.sick_used) },
        { key: "recuperation", label: t("absences.recuperation"), value: n(b.recuperation_used) },
        { key: "reserve", label: t("absences.reserve"), value: n(b.reserve_days) },
      ];
  }
}

function byCode(lines: { code: string; amount: string }[], nameOf: NameOf): Part[] {
  const out = new Map<string, Part>();
  for (const l of lines) {
    const cur = out.get(l.code);
    out.set(l.code, { key: l.code, label: nameOf(l.code), value: (cur?.value ?? 0) + n(l.amount) });
  }
  return [...out.values()];
}

/** Every part used by any of these payslips, in first-seen order: the columns of a section table. */
export function sectionColumns(slips: Payslip[], section: Section, t: Translate, nameOf: NameOf): Part[] {
  const seen = new Map<string, Part>();
  for (const slip of slips)
    for (const p of sectionParts(slip, section, t, nameOf)) {
      const cur = seen.get(p.key);
      seen.set(p.key, { ...p, value: (cur?.value ?? 0) + Math.abs(p.value) });
    }
  // Absences always show their four kinds; money columns only when something was paid.
  return [...seen.values()].filter((p) => section === "absences" || p.value > 0.005);
}

export const sectionTotal = (slip: Payslip, section: Section, t: Translate, nameOf: NameOf) =>
  sectionParts(slip, section, t, nameOf).reduce((a, p) => a + p.value, 0);
