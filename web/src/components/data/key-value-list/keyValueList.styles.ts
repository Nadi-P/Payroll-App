import { cva } from "class-variance-authority";

export const keyValueStyles = {
  list: "flex flex-col",
  row: cva("group flex w-full items-center justify-between gap-4 rounded-md px-2 py-1.5 text-start", {
    variants: {
      explainable: {
        true: "cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2",
        false: "",
      },
      emphasis: { total: "mt-1 border-t border-border pt-2.5", none: "" },
    },
    defaultVariants: { explainable: false, emphasis: "none" },
  }),
  label: "flex min-w-0 items-center gap-1.5",
  explainIcon: "text-subtle opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
  value: "flex shrink-0 items-center gap-2",
};
