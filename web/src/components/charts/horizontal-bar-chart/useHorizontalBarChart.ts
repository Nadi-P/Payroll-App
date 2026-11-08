import { useDirection } from "@radix-ui/react-direction";
import { chartColor, type ChartColor } from "../chart.types";

export interface HorizontalSeries {
  key: string;
  label: string;
  color: ChartColor;
  /** Series with the same stack form one bar. Omit for a single bar per row. */
  stack?: string;
  /** Title of the stack this series belongs to, shown in the tooltip (e.g. "Deductions"). */
  stackLabel?: string;
}

interface PayloadItem {
  dataKey?: unknown;
  value?: unknown;
}

const R = 4;

export function useHorizontalBarChart(series: HorizontalSeries[], rows: number, rowHeight: number) {
  const rtl = useDirection() === "rtl";
  const stacks = [...new Set(series.map((s) => s.stack ?? "main"))];
  const lastOfStack = new Map(stacks.map((st) => [st, [...series].reverse().find((s) => (s.stack ?? "main") === st)?.key]));
  const byKey = new Map(series.map((s) => [s.key, s]));
  // The bar grows away from the start edge, so its rounded end is on the far side.
  const endRadius: [number, number, number, number] = rtl ? [R, 0, 0, R] : [0, R, R, 0];

  return {
    rtl,
    height: Math.max(rows, 1) * rowHeight + 36,
    gap: stacks.length > 1 ? "18%" : "28%",
    barSize: stacks.length > 1 ? 16 : 22,
    colorOf: (s: HorizontalSeries) => chartColor(s.color),
    radiusOf: (s: HorizontalSeries) => (lastOfStack.get(s.stack ?? "main") === s.key ? endRadius : 0),
    legend: series
      .filter((s, i) => series.findIndex((x) => x.label === s.label) === i)
      .map((s) => ({ key: s.key, label: s.label, color: chartColor(s.color) })),
    tooltipRows: (payload: readonly PayloadItem[]) =>
      stacks
        .map((stack) => {
          const rows = payload
            .map((p) => ({ serie: byKey.get(String(p.dataKey)), value: Number(p.value ?? 0) }))
            .filter((r) => r.serie && (r.serie.stack ?? "main") === stack && Math.abs(r.value) > 0.005)
            .map((r) => ({ key: r.serie!.key, label: r.serie!.label, color: chartColor(r.serie!.color), value: r.value }));
          const first = series.find((s) => (s.stack ?? "main") === stack);
          return {
            stack,
            title: stacks.length > 1 ? (first?.stackLabel ?? "") : "",
            total: rows.reduce((a, r) => a + r.value, 0),
            rows,
          };
        })
        .filter((g) => g.rows.length > 0),
  };
}
