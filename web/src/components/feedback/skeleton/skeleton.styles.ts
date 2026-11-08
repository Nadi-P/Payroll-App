import { cva } from "class-variance-authority";

export const skeletonStyles = cva("animate-pulse rounded-md bg-surface-3", {
  variants: {
    shape: {
      line: "h-3.5 w-full",
      title: "h-6 w-48",
      block: "h-24 w-full",
      tall: "h-64 w-full",
      chip: "h-6 w-20 rounded-full",
    },
  },
  defaultVariants: { shape: "line" },
});

export const skeletonGroup = "flex w-full flex-col gap-2.5";
