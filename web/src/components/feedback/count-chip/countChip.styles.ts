import { cva } from "class-variance-authority";

export const countChipStyles = {
  root: cva("inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[13px] font-semibold", {
    variants: {
      severity: {
        error: "border-danger/25 bg-danger-soft text-danger",
        warning: "border-warning/25 bg-warning-soft text-warning",
        info: "border-info/20 bg-info-soft text-info",
      },
      interactive: { true: "transition-[filter] hover:brightness-95 dark:hover:brightness-125", false: "" },
    },
  }),
  count: "tabular-nums",
};
