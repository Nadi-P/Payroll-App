import { cva } from "class-variance-authority";

export const reportTableStyles = {
  root: "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm",
  scroller: "relative min-h-0 flex-1 overflow-auto outline-none print:max-h-none! print:overflow-visible",
  table: "border-separate border-spacing-0 text-[13px] [table-layout:fixed]",
  head: cva(
    "group/head sticky top-0 z-20 h-10 border-b border-border bg-surface-2 px-0 text-[12px] font-medium text-muted",
    { variants: { pinned: { true: "z-30", false: "" }, lastPinned: { true: "border-e border-e-border-strong", false: "" } } },
  ),
  headInner: "flex h-10 items-center gap-1 ps-3 pe-1",
  headButton: "flex min-w-0 flex-1 items-center gap-1 text-start hover:text-text",
  headLabel: "truncate",
  headIcons: "flex shrink-0 items-center gap-0.5 text-accent-ink",
  menuButton:
    "flex size-6 shrink-0 items-center justify-center rounded text-subtle opacity-0 transition hover:bg-surface-3 hover:text-text group-hover/head:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100",
  cell: cva("h-[34px] truncate border-b border-border px-3 align-middle select-none", {
    variants: {
      align: { start: "text-start", end: "text-end tabular-nums" },
      pinned: { true: "sticky z-10", false: "" },
      lastPinned: { true: "border-e border-e-border-strong", false: "" },
      highlight: {
        threshold: "bg-warning-soft font-medium text-warning",
        stat: "bg-accent-soft font-medium text-accent-ink",
        duplicate: "bg-danger-soft text-danger",
        none: "bg-surface",
      },
      selected: { true: "shadow-[inset_0_0_0_2px_var(--accent)]", false: "" },
    },
    defaultVariants: { align: "start", pinned: false, lastPinned: false, highlight: "none", selected: false },
  }),
  row: "hover:[&>td]:brightness-[0.98]",
  foot: cva(
    "sticky bottom-0 z-20 h-10 truncate border-t border-border-strong bg-surface-2 px-3 font-semibold text-text",
    {
      variants: {
        align: { start: "text-start", end: "text-end tabular-nums" },
        pinned: { true: "z-30", false: "" },
        lastPinned: { true: "border-e border-e-border-strong", false: "" },
      },
      defaultVariants: { align: "start", pinned: false, lastPinned: false },
    },
  ),
  empty: "flex h-48 items-center justify-center text-[13px] text-subtle",
  status:
    "flex min-h-10 flex-wrap items-center gap-x-5 gap-y-1 border-t border-border bg-surface-2/60 px-4 py-2 text-[12.5px] text-muted",
  statusItem: "flex items-center gap-1.5",
  statusValue: "font-semibold tabular-nums text-text",
  statusSpacer: "flex-1",
};

export const reportPivotStyles = {
  root: "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm",
  scroller: "relative min-h-0 flex-1 overflow-auto print:max-h-none! print:overflow-visible",
  table: "border-separate border-spacing-0 text-[13px]",
  colHead: "sticky top-0 z-20 h-9 whitespace-nowrap border-b border-e border-border bg-surface-2 px-3 text-center text-[12px] font-medium text-muted",
  valueHead: "sticky z-20 h-9 whitespace-nowrap border-b border-e border-border bg-surface-2 px-3 text-end text-[12px] font-medium text-muted",
  corner: "sticky start-0 top-0 z-30 border-b border-e border-border-strong bg-surface-2 px-3 text-start text-[12px] font-medium text-muted",
  label: cva(
    "sticky start-0 z-10 h-[34px] whitespace-nowrap border-b border-e border-border-strong px-2 text-start",
    { variants: { total: { true: "bg-surface-2 font-semibold", false: "bg-surface" } } },
  ),
  labelInner: "flex items-center gap-1.5",
  toggle: "flex size-5 shrink-0 items-center justify-center rounded text-subtle hover:bg-surface-3 hover:text-text",
  toggleSpacer: "size-5 shrink-0",
  value: cva("h-[34px] whitespace-nowrap border-b border-e border-border px-3 text-end tabular-nums", {
    variants: {
      highlight: {
        threshold: "bg-warning-soft font-medium text-warning",
        stat: "bg-accent-soft font-medium text-accent-ink",
        none: "",
      },
      total: { true: "bg-surface-2 font-semibold", false: "" },
      group: { true: "font-medium", false: "" },
    },
    defaultVariants: { highlight: "none", total: false, group: false },
  }),
  empty: "flex h-64 items-center justify-center px-6 text-center text-[13px] text-subtle",
};
