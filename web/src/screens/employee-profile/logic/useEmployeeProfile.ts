"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import { useEmployee, usePayslipHistory, useSaveEmployee, useTermChanges } from "@/api/queries";
import type { Address, Employee, EmployeeRecord, IncomeType, Payslip, Profile, Spouse, TaxProfile } from "@/api/types.generated";
import { useRouter } from "@/i18n/navigation";
import { formatDate, formatMoney, formatPeriod } from "@/lib/format";
import { lastDay, periodKey } from "@/lib/period";
import { companyHref, useShellContext } from "@/screens/app-shell/logic/useShellContext";
import { useExplain } from "@/screens/shared/explain-panel/logic/useExplain";
import { useComponentNames } from "@/screens/shared/logic/catalogNames";
import { canEnter } from "@/screens/shared/logic/entryEditing";

export type ProfileTab = "details" | "terms" | "history";
const isTab = (v: string | null): v is ProfileTab => v === "details" || v === "terms" || v === "history";

export const INCOME_TYPES: IncomeType[] = ["monthly", "additional", "partial", "daily", "pension", "stipend"];

export function useEmployeeProfile() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams<{ employeeId: string }>();
  const employeeId = decodeURIComponent(params.employeeId ?? "");
  const ctx = useShellContext();
  const router = useRouter();
  const companyId = ctx.companyId ?? "";
  const record = useEmployee(companyId, employeeId);
  const history = usePayslipHistory(companyId, employeeId);
  const changes = useTermChanges(companyId, employeeId);
  const search = useSearchParams();
  const save = useSaveEmployee(companyId);
  const explain = useExplain();
  const names = useComponentNames(lastDay(ctx.period));
  const standingOptions = names.catalog.filter(canEnter).map((c) => ({ value: c.code, label: names.nameOf(c) }));
  const [tab, setTab] = useState<ProfileTab>(isTab(search.get("tab")) ? (search.get("tab") as ProfileTab) : "details");
  const [draft, setDraft] = useState<EmployeeRecord | null>(null);
  const [openSlip, setOpenSlip] = useState<Payslip | null>(null);

  useEffect(() => {
    if (record.data) setDraft(record.data);
  }, [record.data]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(record.data), [draft, record.data]);
  const update = (change: (r: EmployeeRecord) => EmployeeRecord) => setDraft((d) => (d ? change(d) : d));
  const emp = draft?.employee;
  const slips = history.data ?? [];
  // The employee's page in the company's working month, if they are employed in it.
  const current = ctx.currentOf(companyId);
  const employedNow =
    !!emp && emp.start_date <= lastDay(current) && (!emp.end_date || emp.end_date >= `${periodKey(current)}-01`);
  const months = emp ? monthsBetween(emp.start_date, emp.end_date ?? new Date().toISOString().slice(0, 10)) : 0;

  return {
    t,
    explain,
    loading: record.isLoading || !draft,
    notFound: record.error instanceof ApiError && record.error.status === 404,
    draft,
    name: draft ? `${draft.profile.first_name} ${draft.profile.last_name}` : "",
    tab,
    setTab,
    dirty,
    saving: save.isPending,
    saved: save.isSuccess && !dirty,
    saveError: save.error instanceof ApiError ? save.error.detail : null,
    save: () => draft && save.mutate(draft),
    discard: () => setDraft(record.data ?? null),
    setProfile: <K extends keyof Profile>(key: K) => (value: Profile[K]) =>
      update((r) => ({ ...r, profile: { ...r.profile, [key]: value } })),
    setEmployee: <K extends keyof Employee>(key: K) => (value: Employee[K]) =>
      update((r) => ({ ...r, employee: { ...r.employee, [key]: value } })),
    setAddress: <K extends keyof Address>(key: K) => (value: Address[K]) =>
      update((r) => ({ ...r, profile: { ...r.profile, address: { ...(r.profile.address ?? {}), [key]: value } } })),
    setSpouse: <K extends keyof Spouse>(key: K) => (value: Spouse[K]) =>
      update((r) => ({ ...r, profile: { ...r.profile, spouse: { ...(r.profile.spouse ?? {}), [key]: value } } })),
    otherIncome: draft?.profile.other_income ?? [],
    toggleOtherIncome: (type: IncomeType) =>
      update((r) => {
        const cur = r.profile.other_income ?? [];
        return { ...r, profile: { ...r.profile, other_income: cur.includes(type) ? cur.filter((x) => x !== type) : [...cur, type] } };
      }),
    standingOptions,
    setRecord: (r: EmployeeRecord) => setDraft(r),
    canEdit: ctx.canEdit(),
    monthLabel: formatPeriod(current.year, current.month, locale),
    monthHref: companyHref(companyId, current, "payroll", `/${encodeURIComponent(employeeId)}`),
    employedNow,
    openMonth: () => router.push(companyHref(companyId, current, "payroll", `/${encodeURIComponent(employeeId)}`)),
    facts: emp
      ? {
          number: emp.employee_id,
          nationalId: draft?.profile.national_id ?? "",
          start: formatDate(emp.start_date, locale),
          seniority: { years: Math.floor(months / 12), months: months % 12 },
          fraction: Math.round(Number(emp.job_fraction ?? "1") * 100),
          pay: emp.kind === "monthly" ? emp.monthly_salary : emp.hourly_rate,
          kind: emp.kind,
        }
      : null,
    changes: [...(changes.data ?? [])].reverse(),
    changesLoading: changes.isLoading,
    changeDate: (iso: string) => formatDate(iso.slice(0, 10), locale),
    setTax: <K extends keyof TaxProfile>(key: K) => (value: TaxProfile[K]) =>
      update((r) => ({ ...r, employee: { ...r.employee, tax: { ...(r.employee.tax ?? {}), [key]: value } } })),
    children: emp?.tax?.children ?? [],
    addChild: () =>
      update((r) => ({
        ...r,
        employee: { ...r.employee, tax: { ...(r.employee.tax ?? {}), children: [...(r.employee.tax?.children ?? []), { birth_date: "2020-01-01" }] } },
      })),
    setChild: (i: number, value: string | null) =>
      update((r) => ({
        ...r,
        employee: {
          ...r.employee,
          tax: {
            ...(r.employee.tax ?? {}),
            children: (r.employee.tax?.children ?? []).map((c, j) => (j === i ? { birth_date: value ?? c.birth_date } : c)),
          },
        },
      })),
    removeChild: (i: number) =>
      update((r) => ({
        ...r,
        employee: { ...r.employee, tax: { ...(r.employee.tax ?? {}), children: (r.employee.tax?.children ?? []).filter((_, j) => j !== i) } },
      })),
    claims: emp?.tax?.claims ?? [],
    history: slips,
    latest: slips[slips.length - 1],
    chart: slips.map((p) => ({
      month: formatPeriod(p.period.year, p.period.month, locale).split(" ")[0] ?? "",
      net: Number(p.net_pay),
      deductions: Number(p.bases.gross_cash) - Number(p.net_pay),
    })),
    money: (v: number) => formatMoney(v, locale),
    moneyCompact: (v: number) => formatMoney(v, locale, { compact: true }),
    periodLabel: (p: Payslip) => formatPeriod(p.period.year, p.period.month, locale),
    openSlip,
    showSlip: setOpenSlip,
    closeSlip: () => setOpenSlip(null),
    backHref: companyHref(companyId, ctx.period, "employees"),
  };
}

/** Whole months from one date to another. */
function monthsBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.max((ty! - fy!) * 12 + (tm! - fm!) - (td! < fd! ? 1 : 0), 0);
}

export type EmployeeProfileVM = ReturnType<typeof useEmployeeProfile>;
