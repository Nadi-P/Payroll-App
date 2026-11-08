"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError } from "@/api/client";
import { useAddEmployee } from "@/api/queries";
import type { EmploymentKind, Gender } from "@/api/types.generated";
import { useRouter } from "@/i18n/navigation";
import { periodKey } from "@/lib/period";
import { companyHref, useShellContext } from "@/screens/app-shell/logic/useShellContext";

/** The Israeli ID check digit: every second digit doubled, the sum must divide by 10. */
export function validIsraeliId(id: string): boolean {
  if (!/^\d{5,9}$/.test(id)) return false;
  const digits = id.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const x = Number(digits[i]) * (i % 2 === 0 ? 1 : 2);
    sum += x > 9 ? x - 9 : x;
  }
  return sum % 10 === 0;
}

const EMPTY = {
  firstName: "",
  lastName: "",
  nationalId: "",
  birthDate: null as string | null,
  gender: "female" as Gender,
  kind: "monthly" as EmploymentKind,
  pay: null as string | null,
  department: "",
  position: "",
};

/** The few details needed to start paying someone. The rest of Form 101 is in their profile. */
export function useAddEmployeeForm() {
  const t = useTranslations();
  const ctx = useShellContext();
  const router = useRouter();
  const companyId = ctx.companyId ?? "";
  const add = useAddEmployee(companyId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const idError = form.nationalId && !validIsraeliId(form.nationalId) ? t("employees.add.badId") : null;
  const ready =
    !!form.firstName.trim() && !!form.lastName.trim() && validIsraeliId(form.nationalId) && !!form.birthDate && !!form.pay;
  const start = startDate ?? `${periodKey(ctx.period)}-01`;

  return {
    t,
    open,
    show: () => {
      setForm(EMPTY);
      setStartDate(null);
      setTried(false);
      add.reset();
      setOpen(true);
    },
    close: () => setOpen(false),
    form,
    set: <K extends keyof typeof EMPTY>(key: K) => (value: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [key]: value })),
    startDate: start,
    setStartDate,
    tried,
    idError: tried && !form.nationalId ? t("employees.add.badId") : idError,
    saving: add.isPending,
    error: add.error instanceof ApiError ? add.error.detail : null,
    save: () => {
      setTried(true);
      if (!ready || !form.birthDate) return;
      add.mutate(
        {
          company_id: companyId,
          profile: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            national_id: form.nationalId.padStart(9, "0"),
            department: form.department,
            position: form.position,
          },
          employee: {
            employee_id: "new",
            birth_date: form.birthDate,
            gender: form.gender,
            start_date: start,
            kind: form.kind,
            monthly_salary: form.kind === "monthly" ? form.pay : null,
            hourly_rate: form.kind === "hourly" ? form.pay : null,
            pension: {},
          },
        },
        {
          onSuccess: (record) => {
            setOpen(false);
            router.push(companyHref(companyId, ctx.period, "employees", `/${record.employee.employee_id}`));
          },
        },
      );
    },
  };
}

export type AddEmployeeForm = ReturnType<typeof useAddEmployeeForm>;
