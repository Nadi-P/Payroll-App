"use client";

import { useLocale, useTranslations } from "next-intl";
import { ApiError } from "@/api/client";
import { useCorrections, useMonth, useMonths, useReopenMonth } from "@/api/queries";
import type { EmployeeDiff, MonthInfo } from "@/api/types.generated";
import { useRouter } from "@/i18n/navigation";
import { formatPeriod } from "@/lib/format";
import { periodKey } from "@/lib/period";
import { companyHref, useShellContext } from "@/screens/app-shell/logic/useShellContext";
import { useComponentNames } from "@/screens/shared/logic/catalogNames";

export function useCorrectionsScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const ctx = useShellContext();
  const companyId = ctx.companyId ?? "";
  const month = useMonth(companyId, ctx.period);
  const months = useMonths(companyId);
  const diff = useCorrections(companyId, ctx.period);
  const reopen = useReopenMonth(companyId, ctx.period);
  const names = useComponentNames(`${periodKey(ctx.period)}-01`);

  const people = new Map(
    (month.data?.employees ?? []).map((r) => [r.employee.employee_id, `${r.profile.first_name} ${r.profile.last_name}`]),
  );
  const items = (diff.data?.items ?? []).filter((i) => i.diff.lines.length > 0 || Number(i.diff.net_pay) !== 0);
  const status = month.data?.status;

  return {
    t,
    monthLabel: formatPeriod(ctx.period.year, ctx.period.month, locale),
    status,
    /** Reopened = a draft that still holds the previously approved payslips to compare against. */
    reopened: status === "draft" && (diff.data?.items.length ?? 0) > 0,
    items,
    nameOf: (d: EmployeeDiff) => people.get(d.employee_id) ?? d.employee_id,
    lineName: names.name,
    totals: {
      net: items.reduce((a, i) => a + Number(i.diff.net_pay), 0),
      tax: items.reduce((a, i) => a + Number(i.diff.income_tax), 0),
      cost: items.reduce((a, i) => a + Number(i.diff.employer_cost), 0),
    },
    months: [...(months.data ?? [])].reverse(),
    periodLabel: (m: MonthInfo) => formatPeriod(m.period.year, m.period.month, locale),
    isCurrent: (m: MonthInfo) => periodKey(m.period) === periodKey(ctx.period),
    openMonth: (m: MonthInfo) => router.push(companyHref(companyId, m.period, "corrections")),
    reopen: () => reopen.mutate(),
    reopening: reopen.isPending,
    error: reopen.error instanceof ApiError ? reopen.error.detail : null,
    payrollHref: companyHref(companyId, ctx.period, "payroll"),
  };
}
