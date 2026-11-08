"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { PanelLabels } from "@/components/data/report-view/panel/panel.types";
import type { ReportLabels } from "@/components/data/report-view/reportView.types";

const AGGS = ["sum", "avg", "count", "min", "max"] as const;
const OPS = [">", ">=", "<", "<=", "==", "between"] as const;
const OP_KEYS = { ">": "gt", ">=": "gte", "<": "lt", "<=": "lte", "==": "eq", between: "between" } as const;
const STATS = ["none", "top10", "top10pct", "bottom10", "bottom10pct", "aboveAvg", "belowAvg"] as const;

/** The report view's and side panel's words, in the user's language. */
export function useReportLabels(): { report: ReportLabels; panel: PanelLabels } {
  const all = useTranslations();
  return useMemo(() => {
    const r = (key: string) => all(`reportView.${key}`);
    const aggregations = Object.fromEntries(AGGS.map((a) => [a, r(`aggregations.${a}`)])) as ReportLabels["aggregations"];
    const table = {
      freeze: r("menu.freeze"),
      unfreeze: r("menu.unfreeze"),
      show: r("menu.show"),
      hide: r("menu.hide"),
      sortAsc: r("menu.sortAsc"),
      sortDesc: r("menu.sortDesc"),
      sortNone: r("menu.sortNone"),
      moveUp: r("menu.moveUp"),
      moveDown: r("menu.moveDown"),
      moveStart: r("menu.moveStart"),
      moveEnd: r("menu.moveEnd"),
    };
    const report: ReportLabels = {
      total: r("total"),
      empty: r("empty"),
      emptyPivot: r("emptyPivot"),
      yes: r("yes"),
      aggregations,
      selection: { count: r("selection.count"), sum: r("selection.sum"), average: r("selection.average"), ratio: r("selection.ratio") },
      menu: { ...table, filter: r("menu.filter"), format: r("menu.format"), moveLeft: r("menu.moveLeft"), moveRight: r("menu.moveRight") },
      expand: r("expand"),
      collapse: r("collapse"),
      diff: r("deviations.diff"),
      percent: r("deviations.percent"),
    };
    const panel: PanelLabels = {
      title: r("panel.title"),
      close: r("panel.close"),
      back: r("panel.back"),
      reset: r("panel.reset"),
      save: r("panel.save"),
      presets: r("panel.presets"),
      columns: r("panel.columns"),
      search: r("panel.search"),
      zones: { rows: r("zones.rows"), columns: r("zones.columns"), values: r("zones.values") },
      dropHere: r("zones.dropHere"),
      fields: r("panel.fields"),
      remove: r("panel.remove"),
      moveTo: { rows: r("zones.toRows"), columns: r("zones.toColumns"), values: r("zones.toValues") },
      settings: r("panel.settings"),
      aggregation: r("panel.aggregation"),
      aggregations,
      filter: { title: r("filter.title"), all: r("filter.all"), none: r("filter.none"), clear: r("filter.clear"), empty: r("filter.empty") },
      format: {
        title: r("format.title"),
        threshold: r("format.threshold"),
        operator: r("format.operator"),
        value: r("format.value"),
        to: r("format.to"),
        operators: Object.fromEntries(OPS.map((o) => [o, r(`format.operators.${OP_KEYS[o]}`)])) as PanelLabels["format"]["operators"],
        stat: r("format.stat"),
        stats: Object.fromEntries(STATS.map((k) => [k, r(`format.stats.${k}`)])) as PanelLabels["format"]["stats"],
        duplicates: r("format.duplicates"),
        clear: r("format.clear"),
      },
      deviations: {
        title: r("deviations.title"),
        add: r("deviations.add"),
        name: r("deviations.name"),
        first: r("deviations.first"),
        second: r("deviations.second"),
        diff: r("deviations.diff"),
        percent: r("deviations.percent"),
        remove: r("deviations.remove"),
      },
      table,
      presetsScreen: {
        empty: r("presets.empty"),
        apply: r("presets.apply"),
        makeDefault: r("presets.makeDefault"),
        isDefault: r("presets.isDefault"),
        rename: r("presets.rename"),
        delete: r("presets.delete"),
        saveTitle: r("presets.saveTitle"),
        name: r("presets.name"),
        saveNew: r("presets.saveNew"),
        override: r("presets.override"),
        renameTitle: r("presets.renameTitle"),
        cancel: r("presets.cancel"),
        applied: r("presets.applied"),
      },
    };
    return { report, panel };
  }, [all]);
}
