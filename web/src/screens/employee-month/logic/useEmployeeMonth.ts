"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import { useMonth, useRun, useSaveEntry } from "@/api/queries";
import type { MonthEntry, Payslip } from "@/api/types.generated";
import { formatMoney, formatNumber, formatPeriod } from "@/lib/format";
import { lastDay } from "@/lib/period";
import { companyHref, useShellContext } from "@/screens/app-shell/logic/useShellContext";
import { useExplain } from "@/screens/shared/explain-panel/logic/useExplain";
import { useComponentNames } from "@/screens/shared/logic/catalogNames";
import { issuesOf, flagKey } from "@/screens/shared/logic/flags";
import { colorsFor } from "@/screens/shared/logic/payslipParts";
import { SECTIONS, sectionParts, sectionUnit, type Section } from "@/screens/shared/logic/payrollSections";
import { useSelection } from "@/screens/shared/logic/useSelection";
import { sameEntry } from "@/screens/shared/month-entry/logic/entryDraft";

export interface MonthDataRow {
  id: string;
  section: string;
  item: string;
  quantity: number;
  rate: number;
  amount: number;
  source: string;
}

const n = (v: string | null | undefined) => Number(v ?? 0);

/** One employee in one payroll month: the payslip so far, the month's data, and entering it. */
export function useEmployeeMonth() {
  const t = useTranslations();
  const locale = useLocale();
  const ctx = useShellContext();
  const params = useParams<{ employeeId: string }>();
  const employeeId = decodeURIComponent(params.employeeId ?? "");
  const companyId = ctx.companyId ?? "";
  const period = ctx.period;
  const month = useMonth(companyId, period);
  const run = useRun(companyId, period);
  const save = useSaveEntry(companyId, period);
  const names = useComponentNames(lastDay(period));
  const explain = useExplain();
  const [section, setSection] = useState<Section>("payments");
  const [chartSection, setChartSection] = useState<Section>("payments");
  const parts = useSelection();

  const record = month.data?.employees.find((e) => e.employee.employee_id === employeeId);
  const saved: MonthEntry = useMemo(
    () => month.data?.entries.find((e) => e.employee_id === employeeId)?.entry ?? {},
    [month.data, employeeId],
  );
  const [draft, setDraft] = useState<MonthEntry | null>(null);
  const entry = draft ?? saved;
  const dirty = draft !== null && !sameEntry(draft, saved);
  // A month that changes underneath (another tab, a bulk change) resets an unchanged draft.
  useEffect(() => {
    if (draft && sameEntry(draft, saved)) setDraft(null);
  }, [draft, saved]);

  const slip: Payslip | undefined = run.data?.payslips.find((p) => p.employee_id === employeeId);
  const approved = (run.data?.status ?? month.data?.status) === "approved";
  const canEdit = ctx.canEdit() && !approved;
  const name = record ? `${record.profile.first_name} ${record.profile.last_name}` : "";
  const translate = (key: string) => t(key);

  // ---- the breakdown chart, by section ----
  const chartParts = slip ? sectionParts(slip, chartSection, translate, names.name).filter((p) => Math.abs(p.value) > 0.005) : [];
  const colors = colorsFor(chartParts.map((p) => p.key));
  const partIds = chartParts.map((p) => p.key);
  const days = sectionUnit(chartSection) === "days";

  // ---- every figure of the month, for the data table ----
  const standing = new Set((record?.standing ?? []).map((s) => s.code));
  const typed = new Set([...(entry.lines ?? []), ...(entry.deductions ?? [])].map((l) => l.code));
  const sourceOf = (code: string) =>
    typed.has(code) ? t("monthData.typed") : standing.has(code) ? t("monthData.standing") : t("monthData.calculated");
  const dataRows: MonthDataRow[] = slip
    ? [
        ...slip.lines.map((l, i) => ({
          id: `line-${i}`,
          section: t(l.kind === "benefit" ? "sections.imputed" : "sections.payments"),
          item: names.name(l.code),
          quantity: n(l.quantity),
          rate: n(l.rate),
          amount: n(l.amount),
          source: sourceOf(l.code),
        })),
        ...slip.deductions.map((d) => ({
          id: `ded-${d.code}`,
          section: t("sections.deductions"),
          item: names.name(d.code),
          quantity: 0,
          rate: 0,
          amount: n(d.applied),
          source: sourceOf(d.code),
        })),
        ...[
          { key: "tax", label: t("parts.incomeTax"), value: n(slip.income_tax.tax) },
          { key: "bl", label: t("parts.blEmployee"), value: n(slip.national_insurance.bl_employee) },
          { key: "health", label: t("parts.health"), value: n(slip.national_insurance.health_employee) },
          { key: "blEmployer", label: t("parts.blEmployer"), value: n(slip.national_insurance.bl_employer) },
        ].map((p) => ({
          id: `law-${p.key}`,
          section: t("monthData.statutory"),
          item: p.label,
          quantity: 0,
          rate: 0,
          amount: p.value,
          source: t("monthData.calculated"),
        })),
        ...sectionParts(slip, "funds", translate, names.name)
          .filter((p) => Math.abs(p.value) > 0.005)
          .map((p) => ({
            id: `fund-${p.key}`,
            section: t("sections.funds"),
            item: p.label,
            quantity: 0,
            rate: 0,
            amount: p.value,
            source: t("monthData.calculated"),
          })),
      ]
    : [];

  const error = [save.error, run.error].find((e) => e instanceof ApiError) as ApiError | undefined;

  return {
    t,
    explain,
    loading: month.isLoading || (run.isLoading && !run.data),
    missing: !month.isLoading && !!month.data && !record,
    recalculating: run.isFetching || save.isPending,
    error: error?.detail ?? null,
    record,
    slip,
    name,
    position: record?.profile.position ?? "",
    department: record?.profile.department ?? "",
    employeeId,
    monthLabel: formatPeriod(period.year, period.month, locale),
    issues: issuesOf(slip).map((f) => ({
      ...f,
      title: t(`${flagKey(f.code)}.title`),
      hint: t(`${flagKey(f.code)}.hint`),
    })),
    canEdit,
    catalog: names.catalog,
    nameOf: names.name,
    section,
    setSection,
    entry,
    setEntry: (next: MonthEntry) => setDraft(next),
    dirty,
    saving: save.isPending,
    save: () => save.mutate({ employeeId, entry }, { onSuccess: () => setDraft(null) }),
    discard: () => setDraft(null),
    chart: {
      sections: SECTIONS.map((id) => ({ value: id, label: t(`sections.${id}`) })),
      section: chartSection,
      setSection: (s: string) => {
        setChartSection(s as Section);
        parts.all();
      },
      slices: chartParts.filter((p) => parts.has(p.key)).map((p) => ({ ...p, color: colors.get(p.key)! })),
      options: chartParts.map((p) => ({ id: p.key, label: p.label, checked: parts.has(p.key), swatch: `var(--chart-${colors.get(p.key)})` })),
      summary: parts.summary(partIds),
      toggle: parts.toggle,
      all: parts.all,
      none: () => parts.none(partIds),
      format: (v: number) => (days ? `${formatNumber(v, locale)} ${t("absences.days")}` : formatMoney(v, locale)),
      percent: (share: number) => `${formatNumber(share * 100, locale, 1)}%`,
    },
    dataRows,
    hrefs: {
      month: companyHref(companyId, period, "payroll"),
      profile: companyHref(companyId, period, "employees", `/${encodeURIComponent(employeeId)}`),
      terms: companyHref(companyId, period, "employees", `/${encodeURIComponent(employeeId)}?tab=terms`),
      simulate: companyHref(companyId, period, "payroll", `/${encodeURIComponent(employeeId)}/simulate`),
    },
  };
}

export type EmployeeMonthVM = ReturnType<typeof useEmployeeMonth>;
