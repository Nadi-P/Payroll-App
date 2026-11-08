import { cva } from "class-variance-authority";

export const reportPanelStyles = {
  root: cva(
    "flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-[width,opacity] duration-200 print:hidden",
    { variants: { open: { true: "w-full opacity-100 lg:w-[22rem]", false: "hidden" } } },
  ),
  top: "flex h-12 shrink-0 items-center gap-1 border-b border-border px-2",
  title: "min-w-0 flex-1 truncate px-1 text-[13.5px] font-semibold text-text",
  body: "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3",
  section: "flex flex-col gap-2",
  sectionTitle: "px-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-subtle",
  // Column list (table mode)
  list: "flex flex-col gap-0.5",
  colItem: cva(
    "group/item flex h-9 items-center gap-1.5 rounded-lg border border-transparent px-1.5 text-[13px] transition-colors",
    {
      variants: {
        hidden: { true: "text-subtle", false: "text-text" },
        dragOver: { true: "border-accent bg-accent-soft", false: "hover:bg-surface-2" },
      },
    },
  ),
  grip: "flex cursor-grab text-subtle active:cursor-grabbing",
  colName: "min-w-0 flex-1 truncate text-start hover:text-accent-ink",
  colIcons: "flex shrink-0 items-center gap-0.5",
  iconToggle: cva("flex size-7 items-center justify-center rounded-md transition-colors hover:bg-surface-3", {
    variants: { on: { true: "text-accent-ink", false: "text-subtle opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100" } },
  }),
  divider: "my-1 border-t border-dashed border-border",
  // Pivot zones
  bank: "flex max-h-56 flex-wrap content-start gap-1.5 overflow-y-auto rounded-lg border border-border bg-surface-2/50 p-2",
  chip: cva(
    "inline-flex max-w-full cursor-grab items-center gap-1 rounded-md border px-2 py-1 text-[12.5px] active:cursor-grabbing",
    {
      variants: {
        tone: {
          bank: "border-border bg-surface text-text hover:border-border-strong",
          zone: "w-full border-border bg-surface text-text shadow-sm",
        },
        filtered: { true: "border-accent", false: "" },
      },
      defaultVariants: { tone: "bank", filtered: false },
    },
  ),
  chipLabel: "min-w-0 flex-1 truncate",
  chipAgg: "shrink-0 rounded bg-surface-3 px-1.5 text-[11px] font-medium text-muted",
  zone: cva("flex min-h-[3rem] flex-col gap-1 rounded-lg border border-dashed p-1.5 transition-colors", {
    variants: { over: { true: "border-accent bg-accent-soft", false: "border-border-strong" } },
  }),
  zoneEmpty: "flex h-9 items-center justify-center text-[12px] text-subtle",
  indicator: "h-0.5 rounded-full bg-accent",
  zoneHead: "flex items-center justify-between px-1",
  // Field settings
  values: "flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2",
  valueRow: "flex items-center gap-2",
  inline: "flex flex-wrap items-center gap-2",
  grid2: "grid grid-cols-2 gap-2",
  quick: "flex flex-wrap gap-1.5",
  // Deviations
  deviation: "flex flex-col gap-2 rounded-lg border border-border bg-surface-2/50 p-2.5",
  deviationHead: "flex items-center gap-1",
  // Presets
  preset: cva("flex items-center gap-2 rounded-lg border px-2.5 py-2", {
    variants: { applied: { true: "border-accent bg-accent-soft", false: "border-border" } },
  }),
  presetName: "min-w-0 flex-1 truncate text-[13px] font-medium",
  presetActions: "flex shrink-0 items-center gap-0.5",
  dialogBody: "flex flex-col gap-4",
  empty: "px-2 py-6 text-center text-[13px] text-subtle",
};
