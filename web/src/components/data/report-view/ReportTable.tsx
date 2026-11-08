"use client";

import { useDirection } from "@radix-ui/react-direction";
import { DropdownMenu } from "@/components/overlays/dropdown-menu/DropdownMenu";
import { Icon } from "@/components/typography/icon/Icon";
import { reportTableStyles as s } from "./reportView.styles";
import type { ReportConfig, ReportField, ReportLabels, ReportRow } from "./reportView.types";
import { ReportStatusBar } from "./ReportStatusBar";
import { useReportTable } from "./useReportTable";

interface ReportTableProps {
  fields: ReportField[];
  rows: ReportRow[];
  config: ReportConfig;
  onConfigChange: (config: ReportConfig) => void;
  labels: ReportLabels;
  /** A value as shown: money, numbers and text in the user's language. */
  format: (field: ReportField, value: unknown) => string;
  /** Open the side panel on a column: its filter and conditional formatting. */
  onOpenField: (fieldId: string) => void;
  ariaLabel: string;
}

/** The report as a plain grid: frozen columns, sorting, filters, highlights, totals and selection. */
export function ReportTable({ fields, rows, config, onConfigChange, labels, format, onOpenField, ariaLabel }: ReportTableProps) {
  const vm = useReportTable({ fields, rows, config, onConfigChange, labels });
  const rtl = useDirection() === "rtl";
  const lastPinned = vm.columns.filter((f) => vm.pinned.has(f.id)).length - 1;
  const numeric = (f: ReportField) => f.type === "money" || f.type === "number" || f.type === "quantity";
  // "Left" and "right" follow the screen; in a right-to-left layout the next column is to the left.
  const towards = (side: "left" | "right") => ((side === "left") === rtl ? "next" : "prev");

  return (
    <div className={s.root}>
      <div ref={vm.scrollRef} className={s.scroller} role="region" aria-label={ariaLabel} tabIndex={0}>
        <table className={s.table} style={{ width: vm.totalWidth }} aria-rowcount={vm.display.length}>
          <colgroup>
            {vm.columns.map((f, i) => (
              <col key={f.id} style={{ width: vm.widths[i] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {vm.columns.map((f, i) => {
                const pinned = vm.pinned.has(f.id);
                const sort = vm.sortOf(f.id);
                return (
                  <th
                    key={f.id}
                    scope="col"
                    aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : "none"}
                    className={s.head({ pinned, lastPinned: pinned && i === lastPinned })}
                    style={pinned ? { insetInlineStart: vm.offsets[i] } : undefined}
                  >
                    <div className={s.headInner}>
                      <button type="button" className={s.headButton} onClick={() => vm.cycleSort(f.id)} title={f.label}>
                        <span className={s.headLabel}>{f.label}</span>
                        <span className={s.headIcons}>
                          {pinned ? <Icon name="pin" size="xs" /> : null}
                          {sort ? <Icon name={sort === "asc" ? "arrow-up" : "arrow-down"} size="xs" /> : null}
                          {vm.filtered(f.id) ? <Icon name="filter" size="xs" /> : null}
                          {vm.formatted(f.id) ? <Icon name="sparkles" size="xs" /> : null}
                        </span>
                      </button>
                      <DropdownMenu
                        align="end"
                        label={f.label}
                        trigger={
                          <button type="button" aria-label={f.label} className={s.menuButton}>
                            <Icon name="more" size="sm" />
                          </button>
                        }
                        items={[
                          { id: "asc", label: labels.menu.sortAsc, checked: sort === "asc", onSelect: () => vm.setSort(f.id, "asc") },
                          { id: "desc", label: labels.menu.sortDesc, checked: sort === "desc", onSelect: () => vm.setSort(f.id, "desc") },
                          ...(sort ? [{ id: "none", label: labels.menu.sortNone, onSelect: () => vm.setSort(f.id, null) }] : []),
                          {
                            id: "pin",
                            label: pinned ? labels.menu.unfreeze : labels.menu.freeze,
                            icon: pinned ? ("pin-off" as const) : ("pin" as const),
                            separatorBefore: true,
                            onSelect: () => vm.togglePin(f.id),
                          },
                          { id: "hide", label: labels.menu.hide, icon: "eye-off" as const, onSelect: () => vm.hide(f.id) },
                          { id: "field", label: labels.menu.format, icon: "filter" as const, onSelect: () => onOpenField(f.id) },
                          ...(vm.canMove(f.id, towards("left"))
                            ? [{ id: "left", label: labels.menu.moveLeft, separatorBefore: true, onSelect: () => vm.move(f.id, towards("left")) }]
                            : []),
                          ...(vm.canMove(f.id, towards("right"))
                            ? [{ id: "right", label: labels.menu.moveRight, separatorBefore: !vm.canMove(f.id, towards("left")), onSelect: () => vm.move(f.id, towards("right")) }]
                            : []),
                          ...(vm.canMove(f.id, "prev") ? [{ id: "start", label: labels.menu.moveStart, onSelect: () => vm.move(f.id, "start") }] : []),
                          ...(vm.canMove(f.id, "next") ? [{ id: "end", label: labels.menu.moveEnd, onSelect: () => vm.move(f.id, "end") }] : []),
                        ]}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {vm.padTop > 0 ? (
              <tr aria-hidden>
                <td colSpan={vm.columns.length} style={{ height: vm.padTop, padding: 0 }} />
              </tr>
            ) : null}
            {vm.items.map((item) => {
              const row = vm.display[item.index]!;
              return (
                <tr key={item.key} className={s.row} aria-rowindex={item.index + 2}>
                  {vm.columns.map((f, c) => {
                    const pinned = vm.pinned.has(f.id);
                    const value = row[f.id];
                    return (
                      <td
                        key={f.id}
                        className={s.cell({
                          align: numeric(f) ? "end" : "start",
                          pinned,
                          lastPinned: pinned && c === lastPinned,
                          highlight: vm.highlight(item.index, f.id) ?? "none",
                          selected: vm.selected(item.index, c),
                        })}
                        style={pinned ? { insetInlineStart: vm.offsets[c] } : undefined}
                        onMouseDown={(e) => vm.pointer.down(item.index, c, e.shiftKey)}
                        onMouseEnter={() => vm.pointer.enter(item.index, c)}
                        title={format(f, value)}
                      >
                        {format(f, value)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {vm.padBottom > 0 ? (
              <tr aria-hidden>
                <td colSpan={vm.columns.length} style={{ height: vm.padBottom, padding: 0 }} />
              </tr>
            ) : null}
          </tbody>
          {vm.display.length ? (
            <tfoot>
              <tr>
                {vm.columns.map((f, i) => {
                  const pinned = vm.pinned.has(f.id);
                  const total = vm.totals[i];
                  return (
                    <td
                      key={f.id}
                      className={s.foot({ align: numeric(f) ? "end" : "start", pinned, lastPinned: pinned && i === lastPinned })}
                      style={pinned ? { insetInlineStart: vm.offsets[i] } : undefined}
                    >
                      {i === 0 ? labels.total : total === null || total === undefined ? "" : format(f, total)}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          ) : null}
        </table>
        {vm.display.length === 0 ? <div className={s.empty}>{labels.empty}</div> : null}
      </div>
      <ReportStatusBar rows={vm.display.length} stats={vm.stats} labels={labels} />
    </div>
  );
}
