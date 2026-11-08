/** One of the chart color tokens, --chart-1 to --chart-10. */
export type ChartColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const chartColor = (c: ChartColor) => `var(--chart-${c})`;
