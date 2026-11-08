"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAnnual, useEmployees, useRun, useYearData } from "@/api/queries";
import type { ReportListGroup } from "@/components/navigation/report-list/reportList.types";
import { useRouter } from "@/i18n/navigation";
import { downloadCsv, round2 } from "@/lib/csv";
import { formatDate, formatMoney, formatMonth, formatNumber, formatPeriod } from "@/lib/format";
import { companyHref, useShellContext } from "@/screens/app-shell/logic/useShellContext";
import { useTableLabels } from "@/screens/shared/logic/useTableLabels";
import {
  FILINGS,
  bl126,
  form100,
  form102,
  form106,
  form126,
  form161,
  funds,
  payslips,
  wages,
  type FilingCtx,
  type FilingId,
  type FilingModel,
  type FilingRow,
  type FilingStatus,
  type Frequency,
} from "./filings";

const FREQUENCIES: Frequency[] = ["monthly", "halfYear", "annual", "event"];
const isFilingId = (v: string | null): v is FilingId => FILINGS.some((f) => f.id === v);
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const TONES: Record<FilingStatus, "success" | "warning" | "neutral" | undefined> = {
  ready: "success",
  partial: "warning",
  draft: "warning",
  empty: "neutral",
  none: undefined,
};
const STATUS_TAG: Record<FilingStatus, "success" | "warning" | "neutral"> = {
  ready: "success",
  partial: "warning",
  draft: "warning",
  empty: "neutral",
  none: "neutral",
};

export function useReports() {
  const t = useTranslations();
  const locale = useLocale();
  const ctx = useShellContext();
  const router = useRouter();
  const search = useSearchParams();
  const companyId = ctx.companyId ?? "";
  const { period } = ctx;
  const year = period.year;
  const labels = useTableLabels();

  const run = useRun(companyId, period);
  const annual = useAnnual(companyId, year);
  const yearData = useYearData(companyId, year);
  const lastYear = useYearData(companyId, year - 1);
  const employees = useEmployees(companyId);

  const selected: FilingId = isFilingId(search.get("report")) ? (search.get("report") as FilingId) : "form102";
  const select = (id: string) => {
    if (!isFilingId(id)) return;
    // A plain history update: Next keeps useSearchParams in sync, without a round trip to the server.
    window.history.replaceState(null, "", `?report=${id}`);
  };

  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [wageMonths, setWageMonths] = useState<"3" | "6" | "12">("3");

  const records = new Map((employees.data ?? []).map((e) => [e.employee.employee_id, e]));
  const fctx: FilingCtx = {
    t: (key, values) => t(key, values),
    formatDate: (d) => (d ? formatDate(d, locale) : ""),
    monthName: (m) => formatMonth(m, locale),
    employees: records,
  };
  const summaries = (annual.data?.items ?? []).map((a) => a.summary);
  const covered = annual.data?.months_covered ?? 0;
  const months = [...(lastYear.data?.months ?? []), ...(yearData.data?.months ?? [])];

  // Employees to pick from: those with an annual summary for Form 106, everyone with pay for wages.
  const pickable =
    selected === "form106"
      ? summaries.map((s) => s.employee_id)
      : [...new Set(months.flatMap((m) => (m.status === "approved" ? m.payslips.map((p) => p.employee_id) : [])))];
  const nameOf = (id: string) => {
    const r = records.get(id);
    return r ? `${r.profile.first_name} ${r.profile.last_name}` : id;
  };
  const people = pickable.map((id) => ({ value: id, label: nameOf(id) })).sort((a, b) => a.label.localeCompare(b.label));
  const personId = employeeId && people.some((p) => p.value === employeeId) ? employeeId : (people[0]?.value ?? null);

  const build = (id: FilingId): FilingModel => {
    switch (id) {
      case "form102": return form102(fctx, run.data);
      case "form100": return form100(fctx, run.data, period);
      case "funds": return funds(fctx, run.data);
      case "payslips": return payslips(fctx, run.data);
      case "bl126": return bl126(fctx, yearData.data?.months ?? []);
      case "form126": return form126(fctx, summaries, covered);
      case "form106": return form106(fctx, summaries.find((s) => s.employee_id === personId), covered);
      case "form161": return form161(fctx, year);
      case "wages": return wages(fctx, personId, months, Number(wageMonths), period);
    }
  };

  const monthLabel = formatPeriod(period.year, period.month, locale);
  const next = period.month === 12 ? { y: year + 1, m: 1 } : { y: year, m: period.month + 1 };
  const due: Partial<Record<FilingId, string>> = {
    form102: iso(next.y, next.m, 15),
    form100: iso(next.y, next.m, 15),
    bl126: iso(year, 7, 18),
    form126: iso(year + 1, 4, 30),
    form106: iso(year + 1, 3, 31),
  };
  const periodOf = (f: Frequency) =>
    f === "monthly"
      ? monthLabel
      : f === "halfYear"
        ? t("exports.halfYear", { first: formatMonth(1, locale), last: formatMonth(6, locale), year })
        : f === "annual"
          ? t("exports.taxYear", { year })
          : "";
  const recipient = (id: FilingId) => t(`exports.filings.${id}.recipient`);
  const statusLabel = (s: FilingStatus) => t(`exports.status.${s}`);

  // Each list item's status comes from its own model; the models are cheap to build.
  const models = new Map(FILINGS.map((f) => [f.id, build(f.id)]));
  const model = models.get(selected)!;
  const frequency = FILINGS.find((f) => f.id === selected)!.frequency;
  const loading =
    employees.isLoading ||
    (frequency === "monthly" && run.isLoading) ||
    (frequency === "halfYear" && yearData.isLoading) ||
    (frequency === "annual" && annual.isLoading) ||
    (selected === "wages" && (yearData.isLoading || lastYear.isLoading));

  const groups: ReportListGroup[] = FREQUENCIES.map((f) => ({
    id: f,
    title: t(`exports.groups.${f}`, { month: monthLabel, year }),
    items: FILINGS.filter((x) => x.frequency === f).map((x) => {
      const status = models.get(x.id)!.status;
      return {
        id: x.id,
        label: t(`exports.filings.${x.id}.title`),
        meta: due[x.id] ? t("exports.due", { date: formatDate(due[x.id], locale) }) : recipient(x.id),
        tone: TONES[status],
        toneLabel: statusLabel(status),
      };
    }),
  }));

  const final = model.status === "ready" || model.status === "none";
  const fileName = `${selected}-${companyId}-${frequency === "monthly" ? `${year}-${String(period.month).padStart(2, "0")}` : year}`;
  const show = (f: { value: number; format: "money" | "count" }) =>
    f.format === "money" ? formatMoney(f.value, locale) : formatNumber(f.value, locale, 0);

  return {
    t,
    labels,
    loading,
    year,
    companyName: ctx.current?.company.name ?? "",
    deductionsFile: ctx.current?.company.deductions_file ?? "",
    groups,
    selected,
    select,
    title: t(`exports.filings.${selected}.title`),
    subtitle: t(`exports.filings.${selected}.subtitle`),
    recipient: recipient(selected),
    periodLabel: periodOf(frequency),
    dueLabel: due[selected] ? formatDate(due[selected], locale) : null,
    status: model.status,
    statusLabel: statusLabel(model.status),
    statusTone: STATUS_TAG[model.status],
    statusDetail: model.statusDetail,
    model,
    show,
    final,
    fileName,
    print: () => window.print(),
    /** A filing without a table (Form 106) exports its figures as label and value pairs. */
    exportFigures: () =>
      downloadCsv(fileName, [
        [t("exports.fields.employer"), ctx.current?.company.name ?? ""],
        [t("reports.form102.file"), ctx.current?.company.deductions_file ?? ""],
        ...(personId ? [[t("employees.columns.name"), nameOf(personId)], [t("employees.columns.nationalId"), records.get(personId)?.profile.national_id ?? ""]] : []),
        ...[...model.figures, ...(model.total ? [model.total] : [])].map((f) => [f.label, round2(f.value)]),
      ]),

    needsEmployee: selected === "form106" || selected === "wages",
    employeeId: personId ?? "",
    employeeName: personId ? nameOf(personId) : "",
    employeeNationalId: personId ? (records.get(personId)?.profile.national_id ?? "") : "",
    people,
    setEmployeeId,
    needsMonths: selected === "wages",
    wageMonths,
    setWageMonths,

    terminations: selected === "form161",
    openTermination: (row: FilingRow) => router.push(companyHref(companyId, period, "termination", `?employee=${encodeURIComponent(row.employeeId)}`)),
    startTermination: () => router.push(companyHref(companyId, period, "termination")),
    payslipsLink: selected === "payslips",
    openPayroll: () => router.push(companyHref(companyId, period, "payroll")),
  };
}

export type ReportsVM = ReturnType<typeof useReports>;
