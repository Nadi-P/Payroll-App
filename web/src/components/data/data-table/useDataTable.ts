import { useMemo, useState } from "react";
import { downloadCsv, round2 } from "@/lib/csv";
import type { TableColumn, TableGrouping } from "./dataTable.types";

export function useDataTable<Row>(opts: {
  columns: TableColumn<Row>[];
  rows: Row[];
  groupings?: TableGrouping<Row>[];
  fileName: string;
}) {
  const { columns, rows, groupings, fileName } = opts;
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [groupId, setGroupId] = useState("none");

  const isVisible = (c: TableColumn<Row>) => !(hidden[c.id] ?? c.hidden ?? false);
  const visible = columns.filter(isVisible);
  const grouping = groupings?.find((g) => g.id === groupId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((c) => (c.format ?? "text") === "text" && String(c.value(row)).toLowerCase().includes(q)),
    );
  }, [rows, columns, query]);

  const sumOf = (column: TableColumn<Row>, of: Row[]) => of.reduce((a, row) => a + Number(column.value(row)), 0);

  return {
    query,
    setQuery,
    visible,
    filtered,
    groupId,
    setGroupId,
    groupBy: grouping?.of,
    sumOf,
    columnOptions: columns.map((c) => ({ id: c.id, label: c.header, checked: isVisible(c) })),
    columnSummary: `${visible.length}/${columns.length}`,
    toggleColumn: (id: string) =>
      setHidden((cur) => {
        const column = columns.find((c) => c.id === id);
        return { ...cur, [id]: column ? isVisible(column) : true };
      }),
    showAll: () => setHidden(Object.fromEntries(columns.map((c) => [c.id, false]))),
    showNone: () =>
      setHidden(Object.fromEntries(columns.map((c) => [c.id, !c.sticky]))),
    /** Download what is on screen, as a file that opens in Excel with Hebrew and Arabic intact. */
    exportFile: () => {
      const lines: (string | number)[][] = [
        visible.map((c) => c.header),
        ...filtered.map((row) => visible.map((c) => c.value(row))),
      ];
      if (visible.some((c) => c.total)) lines.push(visible.map((c) => (c.total ? round2(sumOf(c, filtered)) : "")));
      downloadCsv(fileName, lines);
    },
  };
}
