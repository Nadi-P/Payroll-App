"use client";

import { Fragment, type ReactNode } from "react";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { Icon } from "@/components/typography/icon/Icon";
import { dataGridStyles as s } from "./dataGrid.styles";
import type { GridColumn, PastedCell, RowTone } from "./dataGrid.types";
import { useDataGrid } from "./useDataGrid";

interface DataGridProps<Row> {
  columns: GridColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  ariaLabel: string;
  selectedKey?: string | null;
  onSelect?: (row: Row) => void;
  rowTone?: (row: Row) => RowTone;
  readOnly?: boolean;
  framed?: boolean;
  maxHeight?: string;
  empty?: ReactNode;
  /** A paste from a spreadsheet: every cell it fills, saved together. */
  onPasteCells?: (cells: PastedCell<Row>[]) => void;
  /** Group rows under a heading, with subtotals from each column's `groupTotal`. */
  groupBy?: (row: Row) => string;
}

export function DataGrid<Row>(props: DataGridProps<Row>) {
  const {
    columns,
    rowKey,
    ariaLabel,
    selectedKey,
    onSelect,
    rowTone,
    framed,
    maxHeight,
    empty,
    groupBy,
  } = props;
  const grid = useDataGrid(props);
  const hasFooter = columns.some((c) => c.footer !== undefined);

  return (
    <div
      ref={grid.gridRef}
      role="grid"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={grid.onKeyDown}
      onPaste={grid.onPaste}
      style={maxHeight ? { maxHeight } : undefined}
      className={s.scroller({ framed })}
    >
      <table className={s.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                style={
                  col.width
                    ? { width: col.width, minWidth: col.width }
                    : undefined
                }
                aria-sort={
                  grid.sort?.col === col.id
                    ? grid.sort.desc
                      ? "descending"
                      : "ascending"
                    : undefined
                }
                className={s.headCell({ align: col.align, sticky: col.sticky })}
              >
                {col.sortValue ? (
                  <button
                    type="button"
                    onClick={() => grid.toggleSort(col.id)}
                    className={s.sortButton}
                  >
                    {col.header}
                    {grid.sort?.col === col.id ? (
                      <span className={s.sortIcon({ desc: grid.sort.desc })}>
                        <Icon name="chevron-down" size="xs" />
                      </span>
                    ) : null}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={s.empty}>
                {empty}
              </td>
            </tr>
          ) : (
            grid.sortedRows.map((row, r) => {
              const key = rowKey(row);
              const tone = rowTone?.(row) ?? "none";
              const group = groupBy?.(row);
              const prev = grid.sortedRows[r - 1];
              const next = grid.sortedRows[r + 1];
              const opensGroup =
                !!groupBy && (prev === undefined || groupBy(prev) !== group);
              const closesGroup =
                !!groupBy && (next === undefined || groupBy(next) !== group);
              return (
                <Fragment key={key}>
                  {opensGroup ? (
                    <tr>
                      <td colSpan={columns.length} className={s.groupCell}>
                        {group}
                      </td>
                    </tr>
                  ) : null}
                  <tr
                    aria-selected={key === selectedKey}
                    className={s.row({
                      selected: key === selectedKey,
                      clickable: !!onSelect,
                    })}
                  >
                    {columns.map((col, c) => {
                      const editing = grid.editingAt(r, c);
                      if (editing && col.edit) {
                        return (
                          <td
                            key={col.id}
                            onKeyDownCapture={grid.onEditKeyDown}
                            className={s.editCell}
                          >
                            <NumberInput
                              autoFocus
                              size="sm"
                              value={col.edit.value(row)}
                              initialText={editing.initial}
                              suffix={col.edit.suffix}
                              ariaLabel={col.edit.label}
                              onCommit={(v) => grid.commitEdit(row, col, v)}
                              onCancel={grid.cancelEdit}
                            />
                          </td>
                        );
                      }
                      const editable = grid.editableAt(r, c);
                      return (
                        <td
                          key={col.id}
                          role="gridcell"
                          onClick={() => grid.onCellClick(r, c)}
                          onDoubleClick={() => grid.onCellDoubleClick(r, c)}
                          className={s.cell({
                            align: col.align,
                            sticky: col.sticky,
                            active: grid.isActive(r, c),
                            editable,
                            tone,
                          })}
                        >
                          {editable ? (
                            <span className={s.editHint}>{col.cell(row)}</span>
                          ) : (
                            col.cell(row)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {closesGroup ? (
                    <tr>
                      {columns.map((col) => (
                        <td
                          key={col.id}
                          className={s.groupTotalCell({
                            align: col.align,
                            sticky: col.sticky,
                          })}
                        >
                          {col.groupTotal?.(
                            grid.sortedRows.filter(
                              (x) => groupBy?.(x) === group,
                            ),
                          )}
                        </td>
                      ))}
                    </tr>
                  ) : null}
                </Fragment>
              );
            })
          )}
        </tbody>
        {hasFooter && grid.sortedRows.length > 0 ? (
          <tfoot>
            <tr>
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={s.footCell({
                    align: col.align,
                    sticky: col.sticky,
                  })}
                >
                  {col.footer}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
