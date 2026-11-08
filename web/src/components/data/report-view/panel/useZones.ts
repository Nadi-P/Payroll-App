"use client";

import { useState } from "react";
import { syncDeviationValues } from "../reportMath";
import type { Deviation, ReportConfig, ReportField, ValueItem } from "../reportView.types";
import type { Zone } from "./panel.types";

/** What is being dragged: a field from the bank, or an item already in a zone. */
export interface DragSource {
  field: string;
  from: Zone | "bank";
  index?: number;
}

const fieldOf = (item: string | ValueItem) => (typeof item === "string" ? item : item.field);

/** The pivot's three zones and the moves between them (Verisal's preset editor). */
export function useZones(fields: ReportField[], config: ReportConfig, onConfigChange: (c: ReportConfig) => void) {
  const [drag, setDrag] = useState<DragSource | null>(null);
  const [over, setOver] = useState<{ zone: Zone; index: number } | null>(null);
  const used = new Set([...config.rows, ...config.columns, ...config.values.map((v) => v.field)]);
  const numeric = new Set(fields.filter((f) => f.type === "money" || f.type === "quantity" || f.type === "number").map((f) => f.id));

  const zoneItems = (zone: Zone): (string | ValueItem)[] => config[zone];

  /** Move a field into a zone at a position; it leaves wherever it was before. */
  const put = (field: string, zone: Zone, index?: number) => {
    const existing = config.values.find((v) => v.field === field);
    if (existing?.deviationId && zone !== "values") return; // comparisons are values only
    const next: ReportConfig = {
      ...config,
      rows: config.rows.filter((f) => f !== field),
      columns: config.columns.filter((f) => f !== field),
      values: config.values.filter((v) => v.field !== field),
    };
    const entry: string | ValueItem =
      zone === "values" ? (existing ?? { field, aggregation: numeric.has(field) ? "sum" : "count" }) : field;
    const list = [...(next[zone] as (string | ValueItem)[])];
    const at = index === undefined ? list.length : Math.max(0, Math.min(index, list.length));
    list.splice(at, 0, entry);
    onConfigChange({ ...next, [zone]: list });
  };

  const removeAt = (zone: Zone, index: number) => {
    const list = [...(config[zone] as (string | ValueItem)[])];
    const [removed] = list.splice(index, 1);
    let deviations = config.deviations;
    if (zone === "values" && removed && typeof removed !== "string" && removed.deviationId) {
      const flag = removed.kind === "percent" ? "showPercent" : "showDiff";
      deviations = deviations.map((d) => (d.id === removed.deviationId ? { ...d, [flag]: false } : d));
    }
    onConfigChange({ ...config, [zone]: list, deviations });
  };

  const setDeviations = (deviations: Deviation[]) =>
    onConfigChange({ ...config, deviations, values: syncDeviationValues(config.values, deviations) });

  return {
    bank: fields.filter((f) => !used.has(f.id)),
    zoneItems,
    fieldOf,
    over,
    numericFields: config.values.filter((v) => !v.deviationId).map((v) => v.field),
    setAggregation: (index: number, aggregation: ValueItem["aggregation"]) =>
      onConfigChange({ ...config, values: config.values.map((v, i) => (i === index ? { ...v, aggregation } : v)) }),
    put,
    removeAt,
    moveWithin: (zone: Zone, index: number, to: "up" | "down" | "start" | "end") => {
      const list = [...(config[zone] as (string | ValueItem)[])];
      const [item] = list.splice(index, 1);
      if (item === undefined) return;
      const at = to === "up" ? index - 1 : to === "down" ? index + 1 : to === "start" ? 0 : list.length;
      list.splice(Math.max(0, Math.min(at, list.length)), 0, item);
      onConfigChange({ ...config, [zone]: list });
    },
    setDeviations,
    addDeviation: () =>
      setDeviations([
        ...config.deviations,
        { id: `d${Date.now()}`, name: "", sourceA: null, sourceB: null, showDiff: true, showPercent: false },
      ]),
    drag: {
      start: (src: DragSource) => setDrag(src),
      overAt: (zone: Zone, index: number) => setOver({ zone, index }),
      leave: () => setOver(null),
      end: () => {
        setDrag(null);
        setOver(null);
      },
      /** Drop on a zone: at the hovered position, or at its end. */
      dropOn: (zone: Zone) => {
        if (drag) {
          let index = over?.zone === zone ? over.index : undefined;
          if (index !== undefined && drag.from === zone && drag.index !== undefined && index > drag.index) index -= 1;
          put(drag.field, zone, index);
        }
        setDrag(null);
        setOver(null);
      },
      /** Drop back on the bank: the field leaves the pivot. */
      dropOnBank: () => {
        if (drag && drag.from !== "bank" && drag.index !== undefined) removeAt(drag.from, drag.index);
        setDrag(null);
        setOver(null);
      },
    },
  };
}
