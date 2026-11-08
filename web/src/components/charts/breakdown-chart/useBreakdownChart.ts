import { chartColor, type ChartColor } from "../chart.types";

export interface BreakdownSlice {
  key: string;
  label: string;
  value: number;
  color: ChartColor;
}

/**
 * Positive values are drawn as slices. Negative ones (a deduction from pay) cannot be, so they
 * appear only in the list, and the total in the middle includes them.
 */
export function useBreakdownChart(slices: BreakdownSlice[]) {
  const rows = slices.filter((d) => Math.abs(d.value) > 0.005).sort((a, b) => b.value - a.value);
  const total = rows.reduce((a, d) => a + d.value, 0);
  const withFill = rows.map((d) => ({ ...d, fill: chartColor(d.color), share: total ? d.value / total : 0 }));
  return {
    total,
    rows: withFill,
    visible: withFill.filter((d) => d.value > 0),
  };
}
