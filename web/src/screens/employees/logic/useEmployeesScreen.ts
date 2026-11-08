"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useEmployees, useRun } from "@/api/queries";
import type { EmployeeRecord, Payslip, Period } from "@/api/types.generated";
import { useRouter } from "@/i18n/navigation";
import { formatDate } from "@/lib/format";
import { lastDay, periodKey } from "@/lib/period";
import { companyHref, useShellContext } from "@/screens/app-shell/logic/useShellContext";
import { useAddEmployeeForm } from "@/screens/shared/add-employee/logic/useAddEmployeeForm";
import { useEmployeeCharts } from "./useEmployeeCharts";

export type StatusFilter = "active" | "inactive" | "all";

const nameOf = (r: EmployeeRecord) => `${r.profile.first_name} ${r.profile.last_name}`;

/** Employed at some point during the pay month. */
function activeIn(r: EmployeeRecord, p: Period) {
  const first = `${periodKey(p)}-01`;
  return r.employee.start_date <= lastDay(p) && (!r.employee.end_date || r.employee.end_date >= first);
}

export function useEmployeesScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const ctx = useShellContext();
  const companyId = ctx.companyId ?? "";
  const employees = useEmployees(companyId);
  const run = useRun(companyId, ctx.period);
  const addEmployee = useAddEmployeeForm();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");

  const all = employees.data ?? [];
  const isActive = (r: EmployeeRecord) => activeIn(r, ctx.period);
  const slips = run.data?.payslips ?? [];
  const slipOf = new Map(slips.map((p) => [p.employee_id, p]));

  const q = query.trim().toLowerCase();
  const rows = all.filter((r) => {
    if (status !== "all" && isActive(r) !== (status === "active")) return false;
    if (!q) return true;
    const p = r.profile;
    return [p.first_name, p.last_name, p.national_id, p.department, p.position, r.employee.employee_id]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const people = all
    .filter((r) => slipOf.has(r.employee.employee_id))
    .map((r) => ({ id: r.employee.employee_id, name: nameOf(r), slip: slipOf.get(r.employee.employee_id)! }));
  const charts = useEmployeeCharts(people);
  const total = (pick: (p: Payslip) => number) => slips.reduce((a, p) => a + pick(p), 0);
  const n = Number;

  return {
    t,
    charts,
    addEmployee,
    companyName: ctx.current?.company.name ?? "",
    loading: employees.isLoading,
    chartsLoading: run.isLoading,
    rows,
    isActive,
    stats: {
      active: all.filter(isActive).length,
      inactive: all.filter((r) => !isActive(r)).length,
      net: total((p) => n(p.net_pay)),
      cost: total((p) => n(p.employer_cost)),
      pension: total((p) => n(p.contributions.pension_employee) + n(p.contributions.pension_employer) + n(p.contributions.severance_employer)),
      insurance: total((p) => n(p.national_insurance.bl_employee) + n(p.national_insurance.bl_employer)),
      health: total((p) => n(p.national_insurance.health_employee)),
    },
    query,
    setQuery,
    status,
    setStatus,
    nameOf,
    leftLabel: (r: EmployeeRecord) => t("employees.leftOn", { date: formatDate(r.employee.end_date, locale) }),
    open: (r: EmployeeRecord) => router.push(companyHref(companyId, ctx.period, "employees", `/${r.employee.employee_id}`)),
  };
}
