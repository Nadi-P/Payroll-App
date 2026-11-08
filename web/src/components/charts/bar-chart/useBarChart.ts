import { useDirection } from "@radix-ui/react-direction";
import type { ChartColor } from "../chart.types";

export interface ChartSeries {
  key: string;
  label: string;
  /** One of the chart tokens: 1-10. */
  color: ChartColor;
}

export function useBarChart(series: ChartSeries[]) {
  const rtl = useDirection() === "rtl";
  return {
    rtl,
    colorOf: (s: ChartSeries) => `var(--chart-${s.color})`,
    labelOf: (key: string) => series.find((s) => s.key === key)?.label ?? key,
  };
}
