"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import { useEmployee, useMonth, usePreview, useRun, useSaveEmployee, useSaveEntry } from "@/api/queries";
import type { EmployeeRecord, MonthEntry, Payslip } from "@/api/types.generated";
import { useRouter } from "@/i18n/navigation";
import { formatMoney, formatPeriod } from "@/lib/format";
import { lastDay } from "@/lib/period";
import { companyHref, useShellContext } from "@/screens/app-shell/logic/useShellContext";
import { useComponentNames } from "@/screens/shared/logic/catalogNames";
import { canEnter } from "@/screens/shared/logic/entryEditing";
import type { Section } from "@/screens/shared/logic/payrollSections";
import { sameEntry } from "@/screens/shared/month-entry/logic/entryDraft";
import { sameRecord } from "@/screens/shared/terms/logic/termsDraft";

export type SimulationTab = "terms" | "month";

const n = (v: string | null | undefined) => Number(v ?? 0);
const PREVIEW_DELAY = 350;

/** The figures compared before and after, in payslip order. */
const FIGURES: { key: string; label: string; of: (p: Payslip) => number; lower?: boolean }[] = [
  { key: "gross", label: "payroll.stats.gross", of: (p) => n(p.bases.gross_cash) },
  { key: "benefits", label: "sections.imputed", of: (p) => n(p.bases.benefits) },
  { key: "taxable", label: "payslip.taxable", of: (p) => n(p.bases.taxable) },
  { key: "tax", label: "parts.incomeTax", of: (p) => n(p.income_tax.tax), lower: true },
  {
    key: "insurance",
    label: "payroll.stats.insurance",
    of: (p) => n(p.national_insurance.bl_employee) + n(p.national_insurance.health_employee),
    lower: true,
  },
  {
    key: "fundsEmployee",
    label: "simulation.fundsEmployee",
    of: (p) =>
      n(p.contributions.pension_employee) +
      n(p.contributions.study_fund_employee) +
      n(p.contributions.disability_employee) +
      n(p.contributions.other_employee),
  },
  { key: "deductions", label: "sections.deductions", of: (p) => p.deductions.reduce((a, d) => a + n(d.applied), 0) },
  { key: "net", label: "payroll.stats.net", of: (p) => n(p.net_pay) },
  { key: "cost", label: "payroll.stats.cost", of: (p) => n(p.employer_cost), lower: true },
];

/** Try changes to one employee's terms and month, see what they do, then keep or drop them. */
export function useSimulation() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const ctx = useShellContext();
  const params = useParams<{ employeeId: string }>();
  const employeeId = decodeURIComponent(params.employeeId ?? "");
  const companyId = ctx.companyId ?? "";
  const period = ctx.period;
  const employee = useEmployee(companyId, employeeId);
  const month = useMonth(companyId, period);
  const run = useRun(companyId, period);
  const preview = usePreview(companyId, period, employeeId);
  const saveEmployee = useSaveEmployee(companyId);
  const saveEntry = useSaveEntry(companyId, period);
  const names = useComponentNames(lastDay(period));
  const [tab, setTab] = useState<SimulationTab>("terms");
  const [section, setSection] = useState<Section>("payments");
  const [record, setRecord] = useState<EmployeeRecord | null>(null);
  const [entry, setEntry] = useState<MonthEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const savedEntry: MonthEntry = useMemo(
    () => month.data?.entries.find((e) => e.employee_id === employeeId)?.entry ?? {},
    [month.data, employeeId],
  );
  useEffect(() => {
    if (employee.data && record === null) setRecord(employee.data);
  }, [employee.data, record]);
  useEffect(() => {
    if (month.data && entry === null) setEntry(savedEntry);
  }, [month.data, entry, savedEntry]);

  const recordChanged = !!record && !sameRecord(record, employee.data);
  const entryChanged = !!entry && !sameEntry(entry, savedEntry);

  // Recalculate a moment after the last change, not on every keystroke.
  const { mutate } = preview;
  useEffect(() => {
    if (!record || !entry) return;
    const timer = setTimeout(() => mutate({ record, entry }), PREVIEW_DELAY);
    return () => clearTimeout(timer);
  }, [record, entry, mutate]);

  const current = run.data?.payslips.find((p) => p.employee_id === employeeId);
  const before = preview.data?.before ?? current;
  const after = preview.data?.after ?? current;
  const slips = run.data?.payslips ?? [];
  const monthTotal = (pick: (p: Payslip) => number) => slips.reduce((a, p) => a + pick(p), 0);
  const impact = (pick: (p: Payslip) => number) => {
    const now = monthTotal(pick);
    return { before: now, after: before && after ? now - pick(before) + pick(after) : now };
  };

  const error = [preview.error, saveEmployee.error, saveEntry.error].find((e) => e instanceof ApiError) as ApiError | undefined;
  const backHref = companyHref(companyId, period, "payroll", `/${encodeURIComponent(employeeId)}`);

  return {
    t,
    loading: employee.isLoading || month.isLoading || !record || !entry,
    name: record ? `${record.profile.first_name} ${record.profile.last_name}` : "",
    monthLabel: formatPeriod(period.year, period.month, locale),
    canEdit: ctx.canEdit(),
    tab,
    setTab,
    section,
    setSection,
    record,
    setRecord,
    entry,
    setEntry,
    catalog: names.catalog,
    nameOf: names.name,
    standingOptions: names.catalog.filter(canEnter).map((c) => ({ value: c.code, label: names.nameOf(c) })),
    calculating: preview.isPending,
    changed: recordChanged || entryChanged,
    error: error?.detail ?? null,
    after,
    figures: FIGURES.map((f) => ({
      key: f.key,
      label: t(f.label),
      before: before ? f.of(before) : 0,
      after: after ? f.of(after) : 0,
      lower: !!f.lower,
    })),
    impact: [
      { key: "gross", label: t("payroll.stats.gross"), ...impact((p) => n(p.bases.gross_cash)) },
      { key: "net", label: t("payroll.stats.net"), ...impact((p) => n(p.net_pay)) },
      { key: "cost", label: t("payroll.stats.cost"), ...impact((p) => n(p.employer_cost)) },
    ],
    money: (v: number) => formatMoney(v, locale),
    saving,
    save: async () => {
      if (!record || !entry) return;
      setSaving(true);
      try {
        if (recordChanged) await saveEmployee.mutateAsync(record);
        if (entryChanged) await saveEntry.mutateAsync({ employeeId, entry });
        router.push(backHref);
      } finally {
        setSaving(false);
      }
    },
    discard: () => router.push(backHref),
    reset: () => {
      setRecord(employee.data ?? null);
      setEntry(savedEntry);
    },
  };
}

export type SimulationVM = ReturnType<typeof useSimulation>;
