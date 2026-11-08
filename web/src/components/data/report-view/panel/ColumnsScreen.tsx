"use client";

import { DropdownMenu } from "@/components/overlays/dropdown-menu/DropdownMenu";
import { Icon } from "@/components/typography/icon/Icon";
import type { ReportConfig, ReportField } from "../reportView.types";
import type { PanelLabels } from "./panel.types";
import { reportPanelStyles as s } from "./reportPanel.styles";
import { useColumnsList } from "./useColumnsList";

interface ColumnsScreenProps {
  fields: ReportField[];
  config: ReportConfig;
  onConfigChange: (config: ReportConfig) => void;
  labels: PanelLabels;
  onOpenField: (id: string) => void;
}

/** Table mode: every column, to drag into order, freeze, hide, sort, or open for filtering. */
export function ColumnsScreen({ fields, config, onConfigChange, labels, onOpenField }: ColumnsScreenProps) {
  const vm = useColumnsList(fields, config, onConfigChange);
  const L = labels.table;
  return (
    <div className={s.section}>
      <div className={s.sectionTitle}>{labels.columns}</div>
      <div className={s.list} role="list">
        {vm.items.map((item, i) => {
          const id = item.field.id;
          return (
            <div key={id}>
              {i === vm.firstUnpinned && i > 0 ? <div className={s.divider} /> : null}
              <div
                role="listitem"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  vm.drag.start(id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  vm.drag.over(id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  vm.drag.drop(id);
                }}
                onDragEnd={vm.drag.end}
                className={s.colItem({ hidden: item.hidden, dragOver: item.dragOver })}
              >
                <span className={s.grip} aria-hidden>
                  <Icon name="grip" size="sm" />
                </span>
                <button type="button" className={s.colName} onClick={() => onOpenField(id)} title={labels.settings}>
                  {item.field.label}
                </button>
                <span className={s.colIcons}>
                  {item.filtered ? <Icon name="filter" size="xs" tone="accent" /> : null}
                  <button
                    type="button"
                    className={s.iconToggle({ on: !!item.sort })}
                    aria-label={item.sort === "asc" ? L.sortDesc : item.sort === "desc" ? L.sortNone : L.sortAsc}
                    onClick={() => vm.cycleSort(id)}
                  >
                    <Icon name={item.sort === "desc" ? "arrow-down" : "arrow-up"} size="xs" />
                  </button>
                  <button
                    type="button"
                    className={s.iconToggle({ on: item.pinned })}
                    aria-label={item.pinned ? L.unfreeze : L.freeze}
                    aria-pressed={item.pinned}
                    onClick={() => vm.togglePin(id)}
                  >
                    <Icon name="pin" size="xs" />
                  </button>
                  <button
                    type="button"
                    className={s.iconToggle({ on: item.hidden })}
                    aria-label={item.hidden ? L.show : L.hide}
                    aria-pressed={item.hidden}
                    onClick={() => vm.toggleHidden(id)}
                  >
                    <Icon name={item.hidden ? "eye-off" : "eye"} size="xs" />
                  </button>
                  <DropdownMenu
                    align="end"
                    label={item.field.label}
                    trigger={
                      <button type="button" className={s.iconToggle({ on: false })} aria-label={labels.settings}>
                        <Icon name="more" size="xs" />
                      </button>
                    }
                    items={[
                      ...(vm.canMove(id, "up") ? [{ id: "up", label: L.moveUp, icon: "arrow-up" as const, onSelect: () => vm.move(id, "up") }] : []),
                      ...(vm.canMove(id, "down") ? [{ id: "down", label: L.moveDown, icon: "arrow-down" as const, onSelect: () => vm.move(id, "down") }] : []),
                      ...(vm.canMove(id, "up") ? [{ id: "start", label: L.moveStart, onSelect: () => vm.move(id, "start") }] : []),
                      ...(vm.canMove(id, "down") ? [{ id: "end", label: L.moveEnd, onSelect: () => vm.move(id, "end") }] : []),
                      { id: "pin", label: item.pinned ? L.unfreeze : L.freeze, icon: item.pinned ? ("pin-off" as const) : ("pin" as const), separatorBefore: true, onSelect: () => vm.togglePin(id) },
                      { id: "hide", label: item.hidden ? L.show : L.hide, icon: item.hidden ? ("eye" as const) : ("eye-off" as const), onSelect: () => vm.toggleHidden(id) },
                      { id: "asc", label: L.sortAsc, checked: item.sort === "asc", separatorBefore: true, onSelect: () => vm.setSort(id, "asc") },
                      { id: "desc", label: L.sortDesc, checked: item.sort === "desc", onSelect: () => vm.setSort(id, "desc") },
                      ...(item.sort ? [{ id: "none", label: L.sortNone, onSelect: () => vm.setSort(id, null) }] : []),
                      { id: "field", label: labels.filter.title, icon: "filter" as const, separatorBefore: true, onSelect: () => onOpenField(id) },
                    ]}
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
