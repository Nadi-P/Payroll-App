"use client";

import { useDirection } from "@radix-ui/react-direction";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useBaseReport } from "@/api/queries";
import { exportReport } from "@/components/data/report-view/exportReport";
import type { PresetsState } from "@/components/data/report-view/panel/panel.types";
import { applyFilters } from "@/components/data/report-view/reportMath";
import type { ReportConfig, ReportField } from "@/components/data/report-view/reportView.types";
import { useUserId } from "@/lib/currentUser";
import { formatMoney, formatNumber } from "@/lib/format";
import { useShellContext } from "@/screens/app-shell/logic/useShellContext";
import { useComponentNames } from "@/screens/shared/logic/catalogNames";
import { analyze, type Fmt } from "./analysis";
import { BASE_REPORTS, REPORT_ICONS, defaultConfig, isBaseReport, reportFields, toRow, type BaseReportId } from "./baseReports";
import { loadReport, storeReport, type StoredReport } from "./reportStore";
import { useReportLabels } from "./useReportLabels";

export type ViewMode = "table" | "pivot" | "analysis";
const isMode = (v: string | null): v is ViewMode => v === "table" || v === "pivot" || v === "analysis";
const DRAFT_DELAY = 400;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Data history: a gallery of base reports; each opens as a table, a pivot or an analysis. */
export function useDataHistory() {
  const t = useTranslations();
  const locale = useLocale();
  const rtl = useDirection() === "rtl";
  const ctx = useShellContext();
  const search = useSearchParams();
  const userId = useUserId();
  const companyId = ctx.companyId ?? "";
  const labels = useReportLabels();
  const names = useComponentNames(new Date().toISOString().slice(0, 10));

  const report: BaseReportId | null = isBaseReport(search.get("report")) ? (search.get("report") as BaseReportId) : null;
  const mode: ViewMode = isMode(search.get("view")) ? (search.get("view") as ViewMode) : "table";
  const go = (next: { report?: BaseReportId | null; mode?: ViewMode }) => {
    // The address itself, not this render's copy: quick changes must not undo each other.
    const q = new URLSearchParams(window.location.search);
    if (next.report === null) q.delete("report");
    else if (next.report) q.set("report", next.report);
    if (next.mode) q.set("view", next.mode);
    const qs = q.toString();
    window.history.pushState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  const data = useBaseReport(companyId, report);
  const fields: ReportField[] = useMemo(() => (report ? reportFields(report, (k) => t(k)) : []), [report, t]);
  const rows = useMemo(
    () => (report ? (data.data ?? []).map((r) => toRow(report, r, { t: (k) => t(k), nameOf: names.name, yes: labels.report.yes })) : []),
    // `names.name` changes identity every render; the catalog is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report, data.data, names.catalog, t, labels.report.yes],
  );

  // ---- the user's layout of this report: draft, saved layouts, default ----
  const [stored, setStored] = useState<StoredReport>({ presets: [], defaultName: null, draft: null });
  const [config, setConfig] = useState<ReportConfig | null>(null);
  const [appliedName, setAppliedName] = useState<string | null>(null);
  useEffect(() => {
    if (!report || !companyId) return;
    const s = loadReport(userId, companyId, report);
    setStored(s);
    const start = s.presets.find((p) => p.name === s.defaultName)?.config ?? defaultConfig(report);
    setConfig(s.draft ?? start);
    setAppliedName(null);
  }, [report, companyId, userId]);
  const persist = (next: StoredReport) => {
    setStored(next);
    if (report) storeReport(userId, companyId, report, next);
  };
  // Every change is kept as the draft, so leaving and coming back finds the report as it was.
  useEffect(() => {
    if (!report || !config) return;
    const timer = setTimeout(() => storeReport(userId, companyId, report, { ...stored, draft: config }), DRAFT_DELAY);
    return () => clearTimeout(timer);
  }, [config, report, companyId, userId, stored]);

  const base = report ? (stored.presets.find((p) => p.name === (appliedName ?? stored.defaultName))?.config ?? defaultConfig(report)) : null;
  const presets: PresetsState = {
    presets: stored.presets,
    defaultName: stored.defaultName,
    appliedName,
    modified: !!config && !!base && !same(config, base),
    onApply: (name) => {
      const p = stored.presets.find((x) => x.name === name);
      if (p) {
        setConfig(p.config);
        setAppliedName(name);
      }
    },
    onSaveNew: (name) => {
      if (!config) return;
      const others = stored.presets.filter((p) => p.name !== name);
      persist({ ...stored, presets: [...others, { name, config }], defaultName: stored.defaultName ?? name });
      setAppliedName(name);
    },
    onOverride: () => {
      if (!config || !appliedName) return;
      persist({ ...stored, presets: stored.presets.map((p) => (p.name === appliedName ? { ...p, config } : p)) });
    },
    onDelete: (name) => {
      persist({ ...stored, presets: stored.presets.filter((p) => p.name !== name), defaultName: stored.defaultName === name ? null : stored.defaultName });
      if (appliedName === name) setAppliedName(null);
    },
    onRename: (from, to) => {
      if (!to || stored.presets.some((p) => p.name === to)) return;
      persist({
        ...stored,
        presets: stored.presets.map((p) => (p.name === from ? { ...p, name: to } : p)),
        defaultName: stored.defaultName === from ? to : stored.defaultName,
      });
      if (appliedName === from) setAppliedName(to);
    },
    onSetDefault: (name) => persist({ ...stored, defaultName: name }),
    onReset: () => base && setConfig(base),
  };

  const [panelOpen, setPanelOpen] = useState(true);
  const [focusField, setFocusField] = useState<string | null>(null);

  const format = (field: ReportField, value: unknown): string => {
    if (value === null || value === undefined || value === "") return "";
    if (field.type === "money") return formatMoney(Number(value), locale);
    if (field.type === "quantity" || field.type === "number") return formatNumber(Number(value), locale);
    return String(value);
  };
  const fmt = (f: Fmt, v: number) =>
    f === "money"
      ? formatMoney(v, locale)
      : f === "percent"
        ? `${formatNumber(v, locale, 1)}%`
        : f === "days"
          ? `${formatNumber(v, locale)} ${t("absences.days")}`
          : formatNumber(v, locale, 0);

  const filtered = useMemo(() => (config ? applyFilters(rows, config.filters) : rows), [rows, config]);
  const years = [...new Set(rows.map((r) => Number(r.year)))].sort();
  const title = report ? t(`dataHistory.reports.${report}.title`) : "";

  return {
    t,
    companyName: ctx.current?.company.name ?? "",
    gallery: BASE_REPORTS.map((id) => ({
      id,
      icon: REPORT_ICONS[id],
      section: t(`dataHistory.reports.${id}.section`),
      title: t(`dataHistory.reports.${id}.title`),
      description: t(`dataHistory.reports.${id}.description`),
    })),
    open: (id: BaseReportId) => go({ report: id }),
    back: () => go({ report: null }),
    report,
    title,
    mode,
    setMode: (m: ViewMode) => go({ mode: m }),
    loading: data.isLoading || (!!report && !config),
    failed: data.isError,
    fields,
    rows,
    rowCount: filtered.length,
    coverage: years.length ? (years.length === 1 ? String(years[0]) : `${years[0]}–${years[years.length - 1]}`) : "",
    config: config ?? (report ? defaultConfig(report) : null),
    setConfig: (c: ReportConfig) => setConfig(c),
    labels,
    presets,
    format,
    panelOpen,
    togglePanel: () => setPanelOpen((o) => !o),
    closePanel: () => setPanelOpen(false),
    focusField,
    openField: (id: string | null) => {
      setFocusField(id);
      if (id) setPanelOpen(true);
    },
    analysis: report && config ? analyze(report, filtered, (k) => t(k)) : null,
    fmt,
    filtersOn: config ? Object.keys(config.filters).length : 0,
    clearFilters: () => config && setConfig({ ...config, filters: {} }),
    exporting: false,
    exportFile: () => {
      if (!report || !config || mode === "analysis") return;
      void exportReport({
        mode,
        title,
        // Quotes, slashes and the like are not allowed in file names on every system.
        fileName: `${title} - ${ctx.current?.company.name ?? companyId}`.replace(/["*/:<>?\\|]/g, ""),
        fields,
        rows,
        config,
        labels: labels.report,
        rtl,
      });
    },
  };
}

export type DataHistoryVM = ReturnType<typeof useDataHistory>;
