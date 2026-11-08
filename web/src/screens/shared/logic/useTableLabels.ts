"use client";

import { useTranslations } from "next-intl";
import type { TableLabels } from "@/components/data/data-table/dataTable.types";

/** The words every data table uses, in the current language. */
export function useTableLabels(): TableLabels {
  const t = useTranslations();
  return {
    search: t("table.search"),
    columns: t("table.columns"),
    groupBy: t("table.groupBy"),
    noGrouping: t("table.noGrouping"),
    export: t("table.export"),
    selectAll: t("common.selectAll"),
    selectNone: t("common.selectNone"),
    empty: t("table.empty"),
  };
}
