import { cva } from "class-variance-authority";

export const multiSelectStyles = {
  trigger:
    "inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2.5 text-[13px] text-muted shadow-sm transition-colors hover:bg-surface-2 hover:text-text data-[state=open]:bg-surface-2",
  triggerLabel: "font-medium text-text",
  summary: "rounded bg-surface-3 px-1.5 text-[11px] font-semibold tabular-nums text-muted",
  content: "z-50 w-64 animate-pop-in overflow-hidden rounded-lg border border-border bg-surface shadow-lg",
  quick: "flex items-center gap-1 border-b border-border p-1",
  quickItem:
    "flex-1 cursor-default select-none rounded-md px-2 py-1 text-center text-[12px] font-medium text-accent-ink outline-none data-[highlighted]:bg-accent-soft",
  list: "max-h-72 overflow-y-auto p-1",
  item: "flex h-8 cursor-default select-none items-center gap-2 rounded-md px-2 text-[13px] text-text outline-none data-[highlighted]:bg-surface-2",
  box: cva("flex size-4 shrink-0 items-center justify-center rounded border", {
    variants: {
      checked: { true: "border-accent bg-accent text-accent-fg", false: "border-border-strong bg-surface" },
    },
  }),
  swatch: "size-2.5 shrink-0 rounded-sm",
  itemLabel: "min-w-0 flex-1 truncate",
};
