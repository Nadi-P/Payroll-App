"use client";

import { Fragment } from "react";
import { DropdownMenu } from "@/components/overlays/dropdown-menu/DropdownMenu";
import { Icon } from "@/components/typography/icon/Icon";
import type { ReportConfig, ValueItem } from "../reportView.types";
import type { PanelLabels, Zone } from "./panel.types";
import { reportPanelStyles as s } from "./reportPanel.styles";
import type { useZones } from "./useZones";

interface DropZoneProps {
  zone: Zone;
  zones: ReturnType<typeof useZones>;
  config: ReportConfig;
  labelOf: (field: string) => string;
  labels: PanelLabels;
  onOpenField: (id: string) => void;
}

const ZONES: Zone[] = ["rows", "columns", "values"];

/** One zone of the pivot: fields dropped here group the rows, the columns, or give the values. */
export function DropZone({ zone, zones, config, labelOf, labels, onOpenField }: DropZoneProps) {
  const items = zones.zoneItems(zone);
  const over = zones.over?.zone === zone ? zones.over.index : null;
  return (
    <div className={s.section}>
      <div className={s.zoneHead}>
        <div className={s.sectionTitle}>{labels.zones[zone]}</div>
      </div>
      <div
        className={s.zone({ over: zones.over?.zone === zone })}
        onDragOver={(e) => {
          e.preventDefault();
          if (zones.over?.zone !== zone) zones.drag.overAt(zone, items.length);
        }}
        onDrop={(e) => {
          e.preventDefault();
          zones.drag.dropOn(zone);
        }}
      >
        {items.length === 0 ? <div className={s.zoneEmpty}>{labels.dropHere}</div> : null}
        {items.map((item, i) => {
          const field = zones.fieldOf(item);
          const value = typeof item === "string" ? null : (item as ValueItem);
          const filtered = field in config.filters;
          return (
            <Fragment key={`${field}-${i}`}>
              {over === i ? <div className={s.indicator} /> : null}
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  zones.drag.start({ field, from: zone, index: i });
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  zones.drag.overAt(zone, e.clientY < rect.top + rect.height / 2 ? i : i + 1);
                }}
                onDragEnd={zones.drag.end}
                onDoubleClick={() => !value?.deviationId && onOpenField(field)}
                className={s.chip({ tone: "zone", filtered })}
              >
                <Icon name="grip" size="xs" tone="subtle" />
                <span className={s.chipLabel}>{labelOf(field)}</span>
                {value && !value.deviationId ? <span className={s.chipAgg}>{labels.aggregations[value.aggregation]}</span> : null}
                {filtered ? <Icon name="filter" size="xs" tone="accent" /> : null}
                <DropdownMenu
                  align="end"
                  label={labelOf(field)}
                  trigger={
                    <button type="button" aria-label={labels.settings} className={s.iconToggle({ on: true })}>
                      <Icon name="more" size="xs" />
                    </button>
                  }
                  items={[
                    ...(value && !value.deviationId
                      ? (["sum", "avg", "count", "min", "max"] as const).map((agg) => ({
                          id: `agg-${agg}`,
                          label: labels.aggregations[agg],
                          checked: value.aggregation === agg,
                          onSelect: () => zones.setAggregation(i, agg),
                        }))
                      : []),
                    ...(i > 0 ? [{ id: "up", label: labels.table.moveUp, icon: "arrow-up" as const, separatorBefore: !!value, onSelect: () => zones.moveWithin(zone, i, "up") }] : []),
                    ...(i < items.length - 1 ? [{ id: "down", label: labels.table.moveDown, icon: "arrow-down" as const, onSelect: () => zones.moveWithin(zone, i, "down") }] : []),
                    ...(i > 0 ? [{ id: "start", label: labels.table.moveStart, onSelect: () => zones.moveWithin(zone, i, "start") }] : []),
                    ...(i < items.length - 1 ? [{ id: "end", label: labels.table.moveEnd, onSelect: () => zones.moveWithin(zone, i, "end") }] : []),
                    ...(value?.deviationId
                      ? []
                      : ZONES.filter((z) => z !== zone).map((z, k) => ({
                          id: `to-${z}`,
                          label: labels.moveTo[z],
                          separatorBefore: k === 0,
                          onSelect: () => zones.put(field, z),
                        }))),
                    ...(value?.deviationId ? [] : [{ id: "settings", label: labels.settings, icon: "filter" as const, onSelect: () => onOpenField(field) }]),
                    { id: "remove", label: labels.remove, icon: "x" as const, danger: true, separatorBefore: true, onSelect: () => zones.removeAt(zone, i) },
                  ]}
                />
              </div>
            </Fragment>
          );
        })}
        {over === items.length && items.length > 0 ? <div className={s.indicator} /> : null}
      </div>
    </div>
  );
}
