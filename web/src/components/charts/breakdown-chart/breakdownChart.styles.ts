export const breakdownChartStyles = {
  /** Sized by its own width, not the window's: the chart also sits in half-width cards. */
  container: "@container min-w-0",
  root: "grid items-center gap-6 @[32rem]:grid-cols-[200px_minmax(0,1fr)]",
  chart: "relative mx-auto size-[200px]",
  center: "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center",
  centerLabel: "text-[12px] text-subtle",
  centerValue: "text-[19px] font-semibold tracking-tight tabular-nums text-text",
  legend: "flex min-w-0 flex-col",
  row: "grid animate-fade-in grid-cols-[10px_minmax(0,1fr)_3.5rem_7rem] items-center gap-3 border-b border-border py-2 text-[13px] last:border-b-0",
  swatch: "size-2.5 shrink-0 rounded-sm",
  label: "truncate text-text",
  percent: "text-end tabular-nums text-subtle",
  value: "text-end font-medium tabular-nums text-text",
  tooltip: "flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] shadow-lg",
  tooltipLabel: "text-muted",
  tooltipValue: "font-semibold tabular-nums text-text",
  empty: "flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-[13px] text-subtle",
};
