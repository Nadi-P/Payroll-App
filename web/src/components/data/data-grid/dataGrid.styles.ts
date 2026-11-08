import { cva } from "class-variance-authority";

export const dataGridStyles = {
  scroller: cva("relative w-full overflow-auto outline-none print:max-h-none! print:overflow-visible", {
    variants: { framed: { true: "rounded-lg border border-border bg-surface", false: "" } },
    defaultVariants: { framed: true },
  }),
  table: "w-full border-separate border-spacing-0 text-[13px]",
  headCell: cva(
    "sticky top-0 z-10 h-9 whitespace-nowrap border-b border-border bg-surface-2 px-3 text-[12px] font-medium text-muted",
    {
      variants: {
        align: { start: "text-start", end: "text-end" },
        sticky: { true: "start-0 z-20", false: "" },
      },
      defaultVariants: { align: "start", sticky: false },
    },
  ),
  sortButton: "inline-flex items-center gap-1 rounded-sm hover:text-text",
  sortIcon: cva("text-subtle transition-transform", {
    variants: { desc: { true: "rotate-180", false: "" } },
  }),
  row: cva("group", {
    variants: {
      // Solid colors only: the sticky first column must hide what scrolls beneath it.
      selected: { true: "[&>td]:bg-accent-soft", false: "hover:[&>td]:bg-surface-2" },
      clickable: { true: "cursor-pointer", false: "" },
    },
  }),
  cell: cva("h-10 border-b border-border bg-surface px-3 align-middle whitespace-nowrap", {
    variants: {
      align: { start: "text-start", end: "text-end tabular-nums" },
      sticky: { true: "sticky start-0 z-[5]", false: "" },
      active: { true: "outline-2 -outline-offset-2 outline-accent", false: "" },
      editable: { true: "cursor-text", false: "" },
      tone: { danger: "first:shadow-[inset_3px_0_0_var(--danger)] rtl:first:shadow-[inset_-3px_0_0_var(--danger)]", warning: "first:shadow-[inset_3px_0_0_var(--warning)] rtl:first:shadow-[inset_-3px_0_0_var(--warning)]", none: "" },
    },
    defaultVariants: { align: "start", sticky: false, active: false, editable: false, tone: "none" },
  }),
  editHint: "rounded px-1 -mx-1 group-hover:bg-surface-3",
  editCell: "h-10 border-b border-border bg-surface px-1.5",
  footCell: cva(
    "sticky bottom-0 h-10 border-t border-border-strong bg-surface-2 px-3 font-semibold whitespace-nowrap",
    {
      variants: {
        align: { start: "text-start", end: "text-end tabular-nums" },
        sticky: { true: "start-0 z-20", false: "" },
      },
      defaultVariants: { align: "start", sticky: false },
    },
  ),
  groupCell: "border-b border-border bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-muted",
  groupTotalCell: cva("h-9 border-b border-border-strong bg-surface px-3 font-medium whitespace-nowrap", {
    variants: {
      align: { start: "text-start", end: "text-end tabular-nums" },
      sticky: { true: "sticky start-0 z-[5]", false: "" },
    },
    defaultVariants: { align: "start", sticky: false },
  }),
  empty: "px-3 py-10",
};
