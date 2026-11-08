export const horizontalBarChartStyles = {
  root: "w-full",
  // Rows added or removed grow or shrink the chart smoothly.
  frame: "transition-[height] duration-300 ease-out",
  tooltip: "min-w-52 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] shadow-lg",
  tooltipTitle: "mb-1.5 font-semibold text-text",
  tooltipGroup: "flex flex-col gap-0.5 [&+&]:mt-2 [&+&]:border-t [&+&]:border-border [&+&]:pt-2",
  tooltipGroupTitle: "mb-0.5 flex items-center justify-between gap-4 font-semibold text-text",
  tooltipRow: "flex items-center justify-between gap-4 text-muted",
  tooltipKey: "inline-flex items-center gap-1.5",
  swatch: "size-2 shrink-0 rounded-sm",
  tooltipValue: "font-medium tabular-nums text-text",
  legend: "flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 text-[12px] text-muted",
  legendItem: "inline-flex items-center gap-1.5",
};

export const chartTheme = {
  grid: "var(--border)",
  axis: "var(--text-subtle)",
  label: "var(--text-muted)",
  cursor: "var(--surface-2)",
  fontSize: 11,
  labelSize: 12,
};
