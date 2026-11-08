"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ApiError } from "@/api/client";
import { useSaveCompany, useSaveComponent } from "@/api/queries";
import type { Company, Component, ComponentKind, CustomComponent, EmployerSettings } from "@/api/types.generated";
import { lastDay } from "@/lib/period";
import { useShellContext } from "@/screens/app-shell/logic/useShellContext";
import { useComponentNames } from "@/screens/shared/logic/catalogNames";

export const FLAGS = ["taxable", "insurable", "pension_base", "study_fund_base", "severance_base"] as const;
export type ComponentFlag = (typeof FLAGS)[number];

const NAME_FIELD = { he: "name_he", en: "name_en", ar: "name_ar", ru: "name_ru" } as const;

const NEW_COMPONENT: CustomComponent = {
  code: "",
  name_he: "",
  name_en: "",
  name_ar: "",
  name_ru: "",
  kind: "earning",
  taxable: true,
  insurable: true,
  pension_base: false,
  study_fund_base: false,
  severance_base: false,
  active: true,
};

export function useSettings() {
  const t = useTranslations();
  const locale = useLocale() as keyof typeof NAME_FIELD;
  const ctx = useShellContext();
  const companyId = ctx.companyId ?? "";
  const names = useComponentNames(lastDay(ctx.period));
  const saveCompany = useSaveCompany(companyId);
  const saveComponent = useSaveComponent(companyId);
  const [query, setQuery] = useState("");
  const company = ctx.current?.company;
  const [draft, setDraft] = useState<Company | null>(null);
  const [editing, setEditing] = useState<CustomComponent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const q = query.trim().toLowerCase();

  useEffect(() => {
    if (company) setDraft(company);
  }, [company]);

  const nameField = NAME_FIELD[locale] ?? "name_en";
  const nextCode = () => {
    const taken = new Set(names.catalog.map((c) => c.code));
    let n = 1;
    while (taken.has(`CUSTOM_${n}`)) n += 1;
    return `CUSTOM_${n}`;
  };

  const error = [saveCompany.error, saveComponent.error].find((e) => e instanceof ApiError) as ApiError | undefined;

  return {
    t,
    draft,
    dirty: JSON.stringify(draft) !== JSON.stringify(company),
    setName: (name: string) => setDraft((d) => (d ? { ...d, name } : d)),
    setFile: (deductions_file: string) => setDraft((d) => (d ? { ...d, deductions_file } : d)),
    setPolicy: <K extends keyof EmployerSettings>(key: K) => (value: EmployerSettings[K]) =>
      setDraft((d) => (d ? { ...d, settings: { ...(d.settings ?? {}), [key]: value } } : d)),
    discard: () => setDraft(company ?? null),
    save: () => draft && saveCompany.mutate(draft),
    saving: saveCompany.isPending,
    error: error?.detail ?? null,
    months: Array.from({ length: 12 }, (_, i) => i + 1),
    query,
    setQuery,
    count: names.catalog.length,
    components: names.catalog.filter((c) => !q || `${c.code} ${names.nameOf(c)}`.toLowerCase().includes(q)),
    nameOf: names.nameOf,
    flagsOf: (c: Component) => FLAGS.filter((f) => c[f]),

    editing,
    isNew,
    editingName: editing?.[nameField] ?? "",
    startNew: () => {
      setIsNew(true);
      setEditing({ ...NEW_COMPONENT, code: nextCode() });
    },
    startEdit: (c: Component) => {
      setIsNew(false);
      setEditing({ ...c });
    },
    closeEditor: () => setEditing(null),
    setEditingName: (name: string) => setEditing((c) => (c ? { ...c, [nameField]: name } : c)),
    setEditingKind: (kind: ComponentKind) => setEditing((c) => (c ? { ...c, kind } : c)),
    setEditingFlag: (flag: ComponentFlag, on: boolean) => setEditing((c) => (c ? { ...c, [flag]: on } : c)),
    setEditingActive: (active: boolean) => setEditing((c) => (c ? { ...c, active } : c)),
    canSaveComponent: !!editing?.[nameField]?.trim(),
    savingComponent: saveComponent.isPending,
    saveComponent: () => {
      if (!editing) return;
      // A name typed once is used in every language until someone translates it.
      const name = editing[nameField];
      const filled = isNew ? { ...editing, name_he: name, name_en: name, name_ar: name, name_ru: name } : editing;
      saveComponent.mutate(filled, { onSuccess: () => setEditing(null) });
    },
  };
}
