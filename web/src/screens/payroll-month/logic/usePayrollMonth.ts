"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import {
  useApproveMonth,
  useCopyPreviousMonth,
  useMonth,
  useProduceMonth,
  useReopenMonth,
  useRun,
  useSaveEntries,
} from "@/api/queries";
import type { EmployeeRecord, MonthEntry, Payslip } from "@/api/types.generated";
import { useRouter } from "@/i18n/navigation";
import { formatMoney, formatMonth, formatPeriod } from "@/lib/format";
import { lastDay, periodKey, shiftPeriod } from "@/lib/period";
import { companyHref, useShellContext } from "@/screens/app-shell/logic/useShellContext";
import { useAddEmployeeForm } from "@/screens/shared/add-employee/logic/useAddEmployeeForm";
import { useComponentNames } from "@/screens/shared/logic/catalogNames";
import { issuesOf, worstSeverity } from "@/screens/shared/logic/flags";
import { SECTIONS, sectionColumns, sectionParts, type Section } from "@/screens/shared/logic/payrollSections";
import { payrollStatus } from "@/screens/shared/logic/payrollStatus";
import { useSelection } from "@/screens/shared/logic/useSelection";
import { canEnter, hoursOf, writeField, type EntryField } from "@/screens/shared/logic/entryEditing";

export interface WorkspaceRow {
  id: string;
  name: string;
  position: string;
  record: EmployeeRecord;
  entry: MonthEntry;
  slip: Payslip | undefined;
  hours: number;
  severity: "error" | "warning" | undefined;
}

const total = (slips: Payslip[], pick: (p: Payslip) => string) => slips.reduce((a, p) => a + Number(pick(p)), 0);
const NO_PRODUCTION = { expected: 0, produced: 0, sent: 0, produced_ids: [], sent_ids: [] };

/** The payroll month workbench: the month's figures, its alerts and every employee by section. */
export function usePayrollMonth() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const ctx = useShellContext();
  const companyId = ctx.companyId ?? "";
  const period = ctx.period;
  const month = useMonth(companyId, period);
  const run = useRun(companyId, period);
  const saveMany = useSaveEntries(companyId, period);
  const copy = useCopyPreviousMonth(companyId, period);
  const names = useComponentNames(lastDay(period));
  const produce = useProduceMonth(companyId, period);
  const approve = useApproveMonth(companyId, period);
  const reopen = useReopenMonth(companyId, period);
  const [section, setSection] = useState<Section>("payments");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyField, setApplyField] = useState<EntryField>("line:BONUS");
  const [applyValue, setApplyValue] = useState<string | null>(null);
  const applyTo = useSelection();
  const addEmployee = useAddEmployeeForm();

  // Only open months are worked on here; closed ones are seen in Data history.
  const open = ctx.openMonths?.open ?? [];
  const isOpen = open.some((p) => periodKey(p) === periodKey(period));
  useEffect(() => {
    if (ctx.openMonths && !isOpen && companyId) router.replace(companyHref(companyId, ctx.openMonths.current, "payroll"));
  }, [ctx.openMonths, isOpen, companyId, router]);

  const slips = useMemo(() => run.data?.payslips ?? [], [run.data]);
  const rows: WorkspaceRow[] = useMemo(() => {
    const entries = new Map((month.data?.entries ?? []).map((e) => [e.employee_id, e.entry]));
    const bySlip = new Map(slips.map((p) => [p.employee_id, p]));
    return (month.data?.employees ?? []).map((record) => {
      const id = record.employee.employee_id;
      const entry = entries.get(id) ?? {};
      const slip = bySlip.get(id);
      return {
        id,
        name: `${record.profile.first_name} ${record.profile.last_name}`,
        position: record.profile.position ?? "",
        record,
        entry,
        slip,
        hours: hoursOf(entry),
        severity: worstSeverity(slip),
      };
    });
  }, [month.data, slips]);

  const issues = rows.flatMap((r) => issuesOf(r.slip).map((flag) => ({ row: r, flag })));
  const errors = issues.filter((i) => i.flag.severity === "error");
  const warnings = issues.filter((i) => i.flag.severity === "warning");
  const flagged = new Set([...errors, ...warnings].map((i) => i.row.id));
  const approved = (run.data?.status ?? month.data?.status) === "approved";

  const translate = (key: string) => t(key);
  const components = names.catalog.filter(canEnter);
  const isDeduction = (field: EntryField) =>
    names.catalog.find((c) => `line:${c.code}` === field)?.kind === "deduction";
  const partOf = (slip: Payslip | undefined, key: string) =>
    slip ? (sectionParts(slip, section, translate, names.name).find((p) => p.key === key)?.value ?? 0) : 0;
  const status = payrollStatus({
    status: run.data?.status ?? month.data?.status ?? "draft",
    production: run.data?.production ?? NO_PRODUCTION,
  });

  /** Save several cells as one change; each employee is saved once. */
  const editMany = (changes: { row: WorkspaceRow; field: EntryField; value: string | null }[]) => {
    const next = new Map<string, MonthEntry>();
    for (const { row, field, value } of changes) {
      const base = next.get(row.id) ?? row.entry;
      next.set(row.id, writeField(base, row.record, field, value, isDeduction(field)));
    }
    saveMany.mutate({ entries: [...next].map(([employee_id, entry]) => ({ employee_id, entry })) });
  };

  const personIds = rows.map((r) => r.id);
  const apiError = [saveMany.error, copy.error, produce.error, approve.error, reopen.error, run.error].find(
    (e) => e instanceof ApiError,
  ) as ApiError | undefined;
  const previous = shiftPeriod(period, -1);

  return {
    t,
    companyId,
    companyName: ctx.current?.company.name ?? "",
    monthLabel: formatPeriod(period.year, period.month, locale),
    period,
    loading: month.isLoading || (run.isLoading && !run.data),
    recalculating: run.isFetching || saveMany.isPending,
    production: run.data?.production ?? NO_PRODUCTION,
    /** No errors: payslips may be produced. */
    canProduce: !!run.data?.can_produce,
    /** Every payslip produced and sent, and no errors: the month may be closed. */
    canClose: !!run.data?.can_approve,
    produce: () => produce.mutate(),
    producing: produce.isPending,
    unreachable: month.isError && !(month.error instanceof ApiError),
    apiError: rows.length ? (apiError?.detail ?? null) : null,
    approved,
    canEdit: ctx.canEdit() && !approved,
    canReopen: ctx.canManage,
    status,
    statusLabel: t(`portfolio.progress.${status.key}`),
    /** The company's open months to switch between; empty when only one is open. */
    openMonths:
      open.length > 1 ? open.map((p) => ({ value: periodKey(p), label: `${formatMonth(p.month, locale)} ${p.year}` })) : [],
    monthKey: periodKey(period),
    selectMonth: (key: string) => {
      const p = open.find((x) => periodKey(x) === key);
      if (p) router.push(companyHref(companyId, p, "payroll"));
    },
    rows,
    sections: SECTIONS,
    section,
    setSection,
    sectionCols: sectionColumns(slips, section, translate, names.name),
    partOf,
    sectionTotal: (slip: Payslip | undefined) =>
      slip ? sectionParts(slip, section, translate, names.name).reduce((a, p) => a + p.value, 0) : 0,
    columnTotal: (key: string) => slips.reduce((a, p) => a + partOf(p, key), 0),
    totalOfSection: () => slips.reduce((a, p) => a + sectionParts(p, section, translate, names.name).reduce((x, q) => x + q.value, 0), 0),
    open: (row: WorkspaceRow) => router.push(companyHref(companyId, period, "payroll", `/${encodeURIComponent(row.id)}`)),
    addEmployee,
    noEmployees: !month.isLoading && !!month.data && rows.length === 0,
    previousLabel: formatPeriod(previous.year, previous.month, locale),
    copyOpen,
    askCopy: () => setCopyOpen(true),
    closeCopy: () => setCopyOpen(false),
    copyPrevious: () => copy.mutate(undefined, { onSettled: () => setCopyOpen(false) }),
    copying: copy.isPending,
    apply: {
      open: applyOpen,
      show: () => setApplyOpen(true),
      close: () => setApplyOpen(false),
      field: applyField,
      setField: (f: string) => setApplyField(f as EntryField),
      value: applyValue,
      setValue: setApplyValue,
      fieldOptions: components.map((c) => ({ value: `line:${c.code}`, label: names.nameOf(c) })),
      summary: applyTo.summary(personIds),
      people: rows.map((r) => ({ id: r.id, label: r.name, checked: applyTo.has(r.id) })),
      toggle: applyTo.toggle,
      all: applyTo.all,
      none: () => applyTo.none(personIds),
      canSave: applyValue !== null && rows.some((r) => applyTo.has(r.id)) && !saveMany.isPending,
      saving: saveMany.isPending,
      save: () => {
        editMany(rows.filter((r) => applyTo.has(r.id)).map((row) => ({ row, field: applyField, value: applyValue })));
        setApplyOpen(false);
      },
    },
    errorCount: errors.length,
    warningCount: warnings.length,
    flaggedPeople: flagged.size,
    /** "6 errors and 2 warnings in 2 employees". */
    alertText:
      [
        errors.length ? t("flags.count.error", { count: errors.length }) : null,
        warnings.length ? t("flags.count.warning", { count: warnings.length }) : null,
      ]
        .filter(Boolean)
        .join(t("payroll.alertsAnd")) + t("payroll.alertsIn", { people: flagged.size }),
    totals: {
      employees: rows.length,
      gross: total(slips, (p) => p.bases.gross_cash),
      tax: total(slips, (p) => p.income_tax.tax),
      insurance: total(slips, (p) => p.national_insurance.bl_employee) + total(slips, (p) => p.national_insurance.health_employee),
      net: total(slips, (p) => p.net_pay),
      cost: total(slips, (p) => p.employer_cost),
      form102Total: run.data?.form102
        ? ["tax_withheld", "bl_employee", "health_employee", "bl_employer"].reduce(
            (a, k) => a + Number(run.data!.form102[k as keyof typeof run.data.form102]),
            0,
          )
        : null,
    },
    money: (v: number) => formatMoney(v, locale),
    confirmOpen,
    askApprove: () => setConfirmOpen(true),
    closeConfirm: () => setConfirmOpen(false),
    approve: () => approve.mutate(undefined, { onSettled: () => setConfirmOpen(false) }),
    approving: approve.isPending,
    reopen: () => reopen.mutate(),
    reopening: reopen.isPending,
    exceptionsHref: companyHref(companyId, period, "exceptions"),
    go: (href: string) => router.push(href),
  };
}

export type PayrollMonthVM = ReturnType<typeof usePayrollMonth>;
