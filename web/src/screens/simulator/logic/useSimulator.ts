"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import { useSimulation } from "@/api/queries";
import type { PayLine, PayslipInput } from "@/api/types.generated";
import { formatPeriod } from "@/lib/format";
import { defaultPeriod, parsePeriod, periodKey } from "@/lib/period";
import { useExplain } from "@/screens/shared/explain-panel/logic/useExplain";

export interface SimulatorForm {
  kind: "monthly" | "hourly";
  pay: string;
  hours: string;
  jobFraction: string;
  gender: "male" | "female";
  birthDate: string;
  startDate: string;
  period: string;
  resident: boolean;
  mainEmployer: boolean;
  children: string[];
  pension: boolean;
  studyFund: boolean;
  bonus: string;
  travelPerDay: string;
  carPrice: string;
  carType: "" | "electric" | "plug_in_hybrid" | "hybrid";
  phone: boolean;
}

const INITIAL: SimulatorForm = {
  kind: "monthly",
  pay: "15000",
  hours: "182",
  jobFraction: "100",
  gender: "female",
  birthDate: "1990-06-15",
  startDate: "2021-03-01",
  period: periodKey(defaultPeriod()),
  resident: true,
  mainEmployer: true,
  children: [],
  pension: true,
  studyFund: false,
  bonus: "",
  travelPerDay: "",
  carPrice: "",
  carType: "",
  phone: false,
};

const DEBOUNCE_MS = 250;

/** Hourly pay in the simulator is entered as a monthly total of regular hours, spread over weekdays. */
function timesheetFor(form: SimulatorForm, year: number, month: number) {
  const days: { day: string; hours: string }[] = [];
  const total = Number(form.hours) || 0;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const workdays: string[] = [];
  for (let d = 1; d <= last; d++) {
    const date = new Date(Date.UTC(year, month - 1, d));
    if (date.getUTCDay() <= 4) workdays.push(date.toISOString().slice(0, 10)); // Sun-Thu
  }
  const perDay = workdays.length ? Math.min(total / workdays.length, 24) : 0;
  for (const day of workdays) days.push({ day, hours: perDay.toFixed(2) });
  return days;
}

export function buildInput(form: SimulatorForm): PayslipInput | null {
  const period = parsePeriod(form.period);
  if (!period || !form.pay || !form.birthDate || !form.startDate) return null;
  const lines: PayLine[] = form.bonus ? [{ code: "BONUS", amount: form.bonus }] : [];
  const fraction = Number(form.jobFraction) / 100;
  return {
    employee: {
      employee_id: "SIM",
      birth_date: form.birthDate,
      gender: form.gender,
      start_date: form.startDate,
      kind: form.kind,
      monthly_salary: form.kind === "monthly" ? form.pay : null,
      hourly_rate: form.kind === "hourly" ? form.pay : null,
      job_fraction: fraction > 0 && fraction <= 1 ? String(fraction) : "1",
      tax: {
        resident: form.resident,
        main_employer: form.mainEmployer,
        children: form.children.filter(Boolean).map((birth_date) => ({ birth_date })),
      },
      pension: form.pension ? {} : null,
      study_fund: form.studyFund ? { employee_rate: "2.5", employer_rate: "7.5" } : null,
    },
    period,
    settings: { recuperation_month: null },
    lines,
    timesheet: form.kind === "hourly" ? timesheetFor(form, period.year, period.month) : [],
    allowances: {
      travel_daily_cost: form.travelPerDay || null,
      car_list_price: form.carPrice || null,
      car_type: form.carPrice && form.carType ? form.carType : null,
      mobile_phone: form.phone,
    },
  };
}

export function useSimulator() {
  const t = useTranslations();
  const locale = useLocale();
  const explain = useExplain();
  const [form, setForm] = useState<SimulatorForm>(INITIAL);
  const [debounced, setDebounced] = useState<PayslipInput | null>(() => buildInput(INITIAL));

  useEffect(() => {
    const id = setTimeout(() => setDebounced(buildInput(form)), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [form]);

  const result = useSimulation(debounced);
  const set = <K extends keyof SimulatorForm>(key: K) => (value: SimulatorForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const periodOptions = useMemo(() => {
    const options = [];
    for (let year = 2026; year >= 2025; year--)
      for (let month = 12; month >= 1; month--)
        options.push({ value: `${year}-${String(month).padStart(2, "0")}`, label: formatPeriod(year, month, locale) });
    return options;
  }, [locale]);

  return {
    t,
    form,
    set,
    setText: (key: keyof SimulatorForm) => (value: string | null) => setForm((f) => ({ ...f, [key]: value ?? "" })),
    reset: () => setForm(INITIAL),
    addChild: () => setForm((f) => ({ ...f, children: [...f.children, "2020-01-01"] })),
    setChild: (i: number, v: string | null) =>
      setForm((f) => ({ ...f, children: f.children.map((c, j) => (j === i ? (v ?? "") : c)) })),
    removeChild: (i: number) => setForm((f) => ({ ...f, children: f.children.filter((_, j) => j !== i) })),
    periodOptions,
    payslip: result.data,
    calculating: result.isFetching,
    error: result.error instanceof ApiError ? result.error.detail : result.isError ? t("errors.apiBody") : null,
    explain,
  };
}
