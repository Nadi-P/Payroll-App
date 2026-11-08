"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useMonth, useRun } from "@/api/queries";
import type { Flag } from "@/api/types.generated";
import { formatPeriod } from "@/lib/format";
import { companyHref, useShellContext } from "@/screens/app-shell/logic/useShellContext";
import { flagKey, issuesOf } from "@/screens/shared/logic/flags";

export type SeverityFilter = "all" | "error" | "warning" | "info";

export function useExceptions() {
  const t = useTranslations();
  const locale = useLocale();
  const ctx = useShellContext();
  const companyId = ctx.companyId ?? "";
  const run = useRun(companyId, ctx.period);
  const month = useMonth(companyId, ctx.period);
  const [filter, setFilter] = useState<SeverityFilter>("all");

  const names = new Map(
    (month.data?.employees ?? []).map((r) => [r.employee.employee_id, `${r.profile.first_name} ${r.profile.last_name}`]),
  );
  const all = (run.data?.payslips ?? []).flatMap((slip) =>
    issuesOf(slip).map((flag: Flag) => ({
      key: `${slip.employee_id}-${flag.code}`,
      employeeId: slip.employee_id,
      employee: names.get(slip.employee_id) ?? slip.employee_id,
      severity: flag.severity,
      title: t(`${flagKey(flag.code)}.title`),
      hint: t(`${flagKey(flag.code)}.hint`),
      detail: flag.message,
      href: companyHref(companyId, ctx.period, "employees", `/${slip.employee_id}`),
    })),
  );
  const count = (s: SeverityFilter) => (s === "all" ? all.length : all.filter((i) => i.severity === s).length);

  return {
    t,
    loading: run.isLoading,
    monthLabel: formatPeriod(ctx.period.year, ctx.period.month, locale),
    companyName: ctx.current?.company.name ?? "",
    filter,
    setFilter,
    count,
    items: filter === "all" ? all : all.filter((i) => i.severity === filter),
    unverified: run.data?.payslips[0]?.unverified_rules.length ?? 0,
    payrollHref: companyHref(companyId, ctx.period, "payroll"),
  };
}
