"use client";

import { Button } from "@/components/actions/button/Button";
import { Field } from "@/components/inputs/field/Field";
import { Select } from "@/components/inputs/select/Select";
import { uniqueValues } from "../reportMath";
import type { Aggregation, ReportConfig, ReportField, ReportRow } from "../reportView.types";
import { ConditionalFormat } from "./ConditionalFormat";
import type { PanelLabels } from "./panel.types";
import { reportPanelStyles as s } from "./reportPanel.styles";
import { ValueFilter } from "./ValueFilter";

interface FieldScreenProps {
  field: ReportField;
  mode: "table" | "pivot";
  rows: ReportRow[];
  config: ReportConfig;
  onConfigChange: (config: ReportConfig) => void;
  labels: PanelLabels;
  format: (field: ReportField, value: unknown) => string;
}

/** One column's settings: quick table actions, how it adds up, which values to keep, highlights. */
export function FieldScreen({ field, mode, rows, config, onConfigChange, labels, format }: FieldScreenProps) {
  const id = field.id;
  const numeric = field.type === "money" || field.type === "number" || field.type === "quantity";
  const table = config.table;
  const pinned = table.pinned.includes(id);
  const hidden = table.hidden.includes(id);
  const sort = table.sortBy?.columnId === id ? table.sortBy.direction : null;
  const valueIndex = config.values.findIndex((v) => v.field === id && !v.deviationId);
  const L = labels.table;

  const setTable = (patch: Partial<ReportConfig["table"]>) => onConfigChange({ ...config, table: { ...table, ...patch } });
  const without = <T,>(map: Record<string, T>) => Object.fromEntries(Object.entries(map).filter(([k]) => k !== id));

  return (
    <>
      {mode === "table" ? (
        <div className={s.quick}>
          <Button
            size="sm"
            variant={pinned ? "soft" : "secondary"}
            icon={pinned ? "pin-off" : "pin"}
            label={pinned ? L.unfreeze : L.freeze}
            onPress={() =>
              setTable({
                pinned: pinned ? table.pinned.filter((x) => x !== id) : [...table.pinned, id],
                hidden: table.hidden.filter((x) => x !== id),
              })
            }
          />
          <Button
            size="sm"
            variant={hidden ? "soft" : "secondary"}
            icon={hidden ? "eye" : "eye-off"}
            label={hidden ? L.show : L.hide}
            onPress={() =>
              setTable(hidden ? { hidden: table.hidden.filter((x) => x !== id) } : { hidden: [...table.hidden, id], pinned: table.pinned.filter((x) => x !== id) })
            }
          />
          <Button
            size="sm"
            variant={sort ? "soft" : "secondary"}
            icon={sort === "desc" ? "arrow-down" : "arrow-up"}
            label={sort === "asc" ? L.sortAsc : sort === "desc" ? L.sortDesc : L.sortNone}
            onPress={() => {
              const next = sort === null ? "asc" : sort === "asc" ? "desc" : null;
              setTable({ sortBy: next ? { columnId: id, direction: next } : null });
            }}
          />
        </div>
      ) : null}
      {mode === "pivot" && valueIndex >= 0 ? (
        <Field label={labels.aggregation}>
          <Select
            size="sm"
            ariaLabel={labels.aggregation}
            value={config.values[valueIndex]!.aggregation}
            onChange={(v) =>
              onConfigChange({ ...config, values: config.values.map((x, i) => (i === valueIndex ? { ...x, aggregation: v as Aggregation } : x)) })
            }
            options={(["sum", "avg", "count", "min", "max"] as const).map((a) => ({ value: a, label: labels.aggregations[a] }))}
          />
        </Field>
      ) : null}
      <ValueFilter
        values={uniqueValues(rows, id)}
        allowed={config.filters[id]}
        onChange={(allowed) => onConfigChange({ ...config, filters: allowed ? { ...config.filters, [id]: allowed } : without(config.filters) })}
        format={(v) => format(field, v)}
        labels={labels}
      />
      <ConditionalFormat
        numeric={numeric && (mode === "table" || valueIndex >= 0)}
        threshold={config.thresholds[id]}
        onThreshold={(t) => onConfigChange({ ...config, thresholds: t ? { ...config.thresholds, [id]: t } : without(config.thresholds) })}
        stat={config.statHighlights[id]?.kind}
        onStat={(kind) =>
          onConfigChange({ ...config, statHighlights: kind ? { ...config.statHighlights, [id]: { kind } } : without(config.statHighlights) })
        }
        duplicates={mode === "table" ? config.duplicates.includes(id) : undefined}
        onDuplicates={
          mode === "table"
            ? (on) => onConfigChange({ ...config, duplicates: on ? [...config.duplicates.filter((x) => x !== id), id] : config.duplicates.filter((x) => x !== id) })
            : undefined
        }
        labels={labels}
      />
    </>
  );
}
