import { useDirection } from "@radix-ui/react-direction";
import { useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import type { GridColumn, PastedCell } from "./dataGrid.types";

interface Cell {
  row: number;
  col: number;
}

/** A number as spreadsheets copy it ("1,234.50", "₪ 300"); "" clears; anything else is skipped. */
function pastedNumber(text: string): string | null | undefined {
  const clean = text.replace(/[₪,\s]/g, "");
  if (clean === "") return null;
  return /^-?\d*\.?\d+$/.test(clean) ? clean : undefined;
}

export function useDataGrid<Row>(opts: {
  columns: GridColumn<Row>[];
  rows: Row[];
  readOnly?: boolean;
  onSelect?: (row: Row) => void;
  onPasteCells?: (cells: PastedCell<Row>[]) => void;
  groupBy?: (row: Row) => string;
}) {
  const { columns, rows, readOnly, onSelect, onPasteCells, groupBy } = opts;
  const dir = useDirection();
  const gridRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<{ col: string; desc: boolean } | null>(null);
  const [active, setActive] = useState<Cell | null>(null);
  const [editing, setEditing] = useState<(Cell & { initial?: string }) | null>(null);
  // Where the selection goes after an edit: down after Enter, sideways after Tab.
  const afterEdit = useRef<{ row: number; col: number }>({ row: 1, col: 0 });

  const sortedRows = useMemo(() => {
    const col = sort ? columns.find((c) => c.id === sort.col) : undefined;
    let ordered = rows;
    if (sort && col?.sortValue) {
      const value = col.sortValue;
      ordered = [...rows].sort((a, b) => {
        const x = value(a);
        const y = value(b);
        const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        return sort.desc ? -order : order;
      });
    }
    if (!groupBy) return ordered;
    // Rows of a group stay together, keeping the sort order inside the group.
    const groups = new Map<string, Row[]>();
    for (const row of ordered) groups.set(groupBy(row), [...(groups.get(groupBy(row)) ?? []), row]);
    return [...groups.values()].flat();
  }, [rows, columns, sort, groupBy]);

  const editableAt = (cell: Cell) => {
    const col = columns[cell.col];
    const row = sortedRows[cell.row];
    return !readOnly && !!col?.edit && row !== undefined && !col.edit.disabled?.(row);
  };

  const focusGrid = () => gridRef.current?.focus();

  // Selection is reported outside the state update: telling the parent from inside an updater
  // would update another component while this one renders.
  const move = (dRow: number, dCol: number) => {
    const base = active ?? { row: 0, col: 0 };
    const row = Math.min(Math.max(base.row + dRow, 0), sortedRows.length - 1);
    const col = Math.min(Math.max(base.col + dCol, 0), columns.length - 1);
    setActive({ row, col });
    const r = sortedRows[row];
    if (r !== undefined && dRow !== 0) onSelect?.(r);
  };

  const startEdit = (cell: Cell, initial?: string) => {
    if (editableAt(cell)) setEditing({ ...cell, initial });
  };

  const stopEdit = (advance: boolean) => {
    setEditing(null);
    if (advance) move(afterEdit.current.row, afterEdit.current.col);
    afterEdit.current = { row: 1, col: 0 };
    focusGrid();
  };

  /** Fill cells from the active one, as a spreadsheet does. Locked cells are left alone. */
  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    if (editing || !active || readOnly || !onPasteCells) return;
    const text = e.clipboardData.getData("text/plain").replace(/\r/g, "").replace(/\n$/, "");
    if (!text) return;
    e.preventDefault();
    const cells: PastedCell<Row>[] = [];
    text.split("\n").forEach((line, dRow) =>
      line.split("\t").forEach((raw, dCol) => {
        const at = { row: active.row + dRow, col: active.col + dCol };
        const value = pastedNumber(raw);
        const column = columns[at.col];
        const row = sortedRows[at.row];
        if (value === undefined || !column || row === undefined || !editableAt(at)) return;
        cells.push({ row, column, value });
      }),
    );
    if (cells.length) onPasteCells(cells);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (editing || sortedRows.length === 0) return;
    const forward = dir === "rtl" ? -1 : 1;
    const keys: Record<string, () => void> = {
      ArrowDown: () => move(1, 0),
      ArrowUp: () => move(-1, 0),
      ArrowRight: () => move(0, forward),
      ArrowLeft: () => move(0, -forward),
      Home: () => setActive((c) => ({ row: c?.row ?? 0, col: 0 })),
      End: () => setActive((c) => ({ row: c?.row ?? 0, col: columns.length - 1 })),
      Enter: () => {
        const cell = active ?? { row: 0, col: 0 };
        if (editableAt(cell)) startEdit(cell);
        else {
          const r = sortedRows[cell.row];
          if (r !== undefined) onSelect?.(r);
        }
      },
      F2: () => active && startEdit(active),
      Tab: () => move(0, e.shiftKey ? -1 : 1),
    };
    const action = keys[e.key];
    if (action) {
      e.preventDefault();
      action();
    } else if (active && /^[\d.-]$/.test(e.key) && editableAt(active)) {
      e.preventDefault();
      startEdit(active, e.key);
    }
  };

  return {
    gridRef,
    sortedRows,
    sort,
    toggleSort: (col: string) =>
      setSort((s) => (s?.col !== col ? { col, desc: false } : s.desc ? null : { col, desc: true })),
    isActive: (row: number, col: number) => active?.row === row && active?.col === col,
    editingAt: (row: number, col: number) => (editing?.row === row && editing?.col === col ? editing : null),
    editableAt: (row: number, col: number) => editableAt({ row, col }),
    onKeyDown,
    onPaste,
    /** Tab inside an open cell saves it and moves sideways instead of leaving the grid. */
    onEditKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key !== "Tab") return;
      e.preventDefault();
      afterEdit.current = { row: 0, col: e.shiftKey ? -1 : 1 };
      (e.target as HTMLElement).blur();
    },
    onCellClick: (row: number, col: number) => {
      setActive({ row, col });
      const r = sortedRows[row];
      if (r !== undefined) onSelect?.(r);
    },
    onCellDoubleClick: (row: number, col: number) => startEdit({ row, col }),
    commitEdit: (row: Row, col: GridColumn<Row>, value: string | null) => {
      col.edit?.commit(row, value);
      stopEdit(true);
    },
    cancelEdit: () => stopEdit(false),
  };
}
