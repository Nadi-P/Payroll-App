"use client";

import { useState } from "react";
import { SearchInput } from "@/components/inputs/search-input/SearchInput";
import type { ReportConfig, ReportField } from "../reportView.types";
import { DeviationsEditor } from "./DeviationsEditor";
import { DropZone } from "./DropZone";
import type { PanelLabels } from "./panel.types";
import { reportPanelStyles as s } from "./reportPanel.styles";
import { useZones } from "./useZones";

interface LayoutScreenProps {
  fields: ReportField[];
  config: ReportConfig;
  onConfigChange: (config: ReportConfig) => void;
  labels: PanelLabels;
  onOpenField: (id: string) => void;
}

/** Pivot mode: drag fields from the list into rows, columns and values, and order them there. */
export function LayoutScreen({ fields, config, onConfigChange, labels, onOpenField }: LayoutScreenProps) {
  const zones = useZones(fields, config, onConfigChange);
  const [query, setQuery] = useState("");
  const byId = new Map(fields.map((f) => [f.id, f.label]));
  const labelOf = (id: string) => {
    const item = config.values.find((v) => v.field === id && v.deviationId);
    if (item) {
      const d = config.deviations.find((x) => x.id === item.deviationId);
      const name = d?.name || (item.kind === "percent" ? labels.deviations.percent : labels.deviations.diff);
      return item.kind === "percent" ? `${name} %` : name;
    }
    return byId.get(id) ?? id;
  };
  const q = query.trim().toLowerCase();
  const bank = zones.bank.filter((f) => !q || f.label.toLowerCase().includes(q));

  return (
    <>
      <div className={s.section}>
        <div className={s.sectionTitle}>{labels.fields}</div>
        <SearchInput size="sm" value={query} onChange={setQuery} placeholder={labels.search} />
        <div
          className={s.bank}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            zones.drag.dropOnBank();
          }}
        >
          {bank.map((f) => (
            <div
              key={f.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                zones.drag.start({ field: f.id, from: "bank" });
              }}
              onDragEnd={zones.drag.end}
              onDoubleClick={() => zones.put(f.id, f.type === "text" || f.type === "id" ? "rows" : "values")}
              className={s.chip({ tone: "bank", filtered: f.id in config.filters })}
              title={f.label}
            >
              <span className={s.chipLabel}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
      <DropZone zone="rows" zones={zones} config={config} labelOf={labelOf} labels={labels} onOpenField={onOpenField} />
      <DropZone zone="columns" zones={zones} config={config} labelOf={labelOf} labels={labels} onOpenField={onOpenField} />
      <DropZone zone="values" zones={zones} config={config} labelOf={labelOf} labels={labels} onOpenField={onOpenField} />
      <DeviationsEditor
        deviations={config.deviations}
        onChange={zones.setDeviations}
        onAdd={zones.addDeviation}
        sources={zones.numericFields.map((id) => ({ value: id, label: labelOf(id) }))}
        labels={labels}
      />
    </>
  );
}
