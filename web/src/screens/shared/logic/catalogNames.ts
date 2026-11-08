"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { useCatalog, useCompanyCatalog } from "@/api/queries";
import type { Component } from "@/api/types.generated";

/** Pay component names in the current language: the open company's list, or the shipped one. */
export function useComponentNames(onDate: string) {
  const locale = useLocale();
  const params = useParams<{ companyId?: string }>();
  const companyId = params.companyId ? decodeURIComponent(params.companyId) : "";
  const shipped = useCatalog(onDate);
  const own = useCompanyCatalog(companyId, onDate);
  const list = (companyId ? own.data : undefined) ?? shipped.data ?? [];
  const byCode = new Map(list.map((c) => [c.code, c]));
  const nameOf = (c: Component) =>
    ({ he: c.name_he, en: c.name_en, ar: c.name_ar, ru: c.name_ru })[locale] ?? c.name_en;
  return {
    catalog: list,
    nameOf,
    name: (code: string) => {
      const c = byCode.get(code);
      return c ? nameOf(c) : code;
    },
  };
}
