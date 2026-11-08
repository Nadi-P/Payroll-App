import { cva } from "class-variance-authority";

export const dropdownMenuStyles = {
  content:
    "z-50 min-w-48 max-w-96 animate-pop-in overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg",
  label: "px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-subtle",
  item: cva(
    "flex min-h-8 cursor-default select-none items-center gap-2 rounded-md px-2 text-[13px] outline-none data-[highlighted]:bg-surface-2",
    { variants: { danger: { true: "text-danger", false: "text-text" } }, defaultVariants: { danger: false } },
  ),
  itemText: "min-w-0 flex-1 truncate",
  hint: "text-xs text-subtle",
  check: "text-accent-ink",
  separator: "my-1 h-px bg-border",
};
