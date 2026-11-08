"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/api/client";
import { useEmployees, usePayslipHistory, useTermination } from "@/api/queries";
import type { TerminationRequest } from "@/api/types.generated";
import { lastDay } from "@/lib/period";
import { useShellContext } from "@/screens/app-shell/logic/useShellContext";

export const TERMINATION_STEPS = ["employee", "details", "settlement"] as const;

export interface TerminationForm {
  date: string;
  entitled: boolean;
  section14: "none" | "partial" | "full";
  section14Rate: string;
  fundBalance: string;
  noticeRequired: boolean;
  noticeGiven: string;
  vacationBalance: string;
  recuperationDays: string;
}

export function useTerminationWizard() {
  const t = useTranslations();
  const ctx = useShellContext();
  const companyId = ctx.companyId ?? "";
  const search = useSearchParams();
  const employees = useEmployees(companyId);
  const [step, setStep] = useState(0);
  const [employeeId, setEmployeeId] = useState<string | null>(search.get("employee"));
  const history = usePayslipHistory(companyId, employeeId ?? "");
  const termination = useTermination(companyId, employeeId ?? "");
  const [form, setForm] = useState<TerminationForm>({
    date: lastDay(ctx.period),
    entitled: true,
    section14: "full",
    section14Rate: "8.33",
    fundBalance: "",
    noticeRequired: true,
    noticeGiven: "0",
    vacationBalance: "",
    recuperationDays: "0",
  });

  const latest = history.data?.[history.data.length - 1];
  useEffect(() => {
    if (latest) setForm((f) => (f.vacationBalance ? f : { ...f, vacationBalance: latest.balances.vacation }));
  }, [latest]);

  const active = (employees.data ?? []).filter((r) => !r.employee.end_date);
  const employee = (employees.data ?? []).find((r) => r.employee.employee_id === employeeId);

  const request = (): TerminationRequest => ({
    termination_date: form.date,
    entitled_to_severance: form.entitled,
    service_periods:
      employee && form.section14 !== "none"
        ? [
            {
              start: employee.employee.start_date,
              end: form.date,
              section14_rate: form.section14 === "full" ? "8.33" : form.section14Rate || "6",
            },
          ]
        : [],
    severance_fund_balance: form.fundBalance || "0",
    notice_required: form.noticeRequired,
    notice_days_given: form.noticeGiven || "0",
    vacation_balance: form.vacationBalance || "0",
    unpaid_recuperation_days: form.recuperationDays || "0",
  });

  return {
    t,
    step,
    steps: TERMINATION_STEPS.map((id) => ({ id, label: t(`termination.steps.${id}`) })),
    goTo: (i: number) => setStep(i),
    back: () => setStep((s) => Math.max(0, s - 1)),
    next: () => {
      if (step === 1) termination.mutate(request());
      setStep((s) => Math.min(TERMINATION_STEPS.length - 1, s + 1));
    },
    canNext: step === 0 ? !!employee : step === 1 ? !!form.date : false,
    employeeOptions: active.map((r) => ({
      value: r.employee.employee_id,
      label: `${r.profile.first_name} ${r.profile.last_name}`,
      hint: r.profile.position,
    })),
    employeeId: employeeId ?? undefined,
    chooseEmployee: setEmployeeId,
    employee,
    employeeName: employee ? `${employee.profile.first_name} ${employee.profile.last_name}` : "",
    latestSalary: latest?.bases.severance ?? employee?.employee.monthly_salary ?? null,
    form,
    set: <K extends keyof TerminationForm>(key: K) => (value: TerminationForm[K]) => setForm((f) => ({ ...f, [key]: value })),
    setText: (key: keyof TerminationForm) => (value: string | null) => setForm((f) => ({ ...f, [key]: value ?? "" })),
    result: termination.data,
    /** What the employer pays now: its severance share plus notice, vacation and recuperation. */
    total: termination.data
      ? Number(termination.data.employer_severance_payment) +
        Number(termination.data.notice_pay) +
        Number(termination.data.vacation_payout) +
        Number(termination.data.recuperation_payout)
      : null,
    calculating: termination.isPending,
    error: termination.error instanceof ApiError ? termination.error.detail : null,
    restart: () => {
      termination.reset();
      setStep(0);
    },
  };
}
