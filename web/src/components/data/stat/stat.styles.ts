import { cva } from "class-variance-authority";

export const statStyles = {
  root: "flex min-w-0 flex-col gap-1",
  labelRow: "flex items-center gap-1.5 text-muted",
  value: "flex items-baseline gap-2",
  hint: cva("text-[12px]", {
    variants: {
      tone: { default: "text-subtle", positive: "text-success", negative: "text-danger", warning: "text-warning" },
    },
    defaultVariants: { tone: "default" },
  }),
};
