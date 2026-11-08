import { cn } from "@/lib/cn";
import { fieldBox } from "../input.styles";

export const selectStyles = {
  trigger: (opts: { size?: "sm" | "md" | "lg"; invalid?: boolean }) =>
    cn(fieldBox(opts), "flex items-center justify-between gap-2 text-start data-[placeholder]:text-subtle"),
  value: "min-w-0 truncate",
  chevron: "text-subtle",
  content:
    "z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] animate-pop-in overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg",
  item:
    "relative flex h-8 cursor-default select-none items-center gap-2 rounded-md pe-8 ps-2 text-[13px] text-text outline-none data-[highlighted]:bg-surface-2 data-[state=checked]:font-medium",
  itemHint: "ms-auto text-xs text-subtle",
  indicator: "absolute end-2 text-accent-ink",
};
