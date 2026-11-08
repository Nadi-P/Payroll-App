import { cva } from "class-variance-authority";

export const stepsStyles = {
  root: "flex w-full items-center gap-2 overflow-x-auto",
  connector: "h-px min-w-6 flex-1 bg-border-strong",
};

export const stepStyles = cva(
  "flex shrink-0 items-center gap-2 rounded-full py-1 pe-3 ps-1 text-[13px] font-medium transition-colors",
  {
    variants: {
      state: {
        done: "text-text",
        current: "bg-accent-soft text-accent-ink",
        upcoming: "text-subtle",
      },
      clickable: { true: "cursor-pointer hover:bg-surface-2", false: "cursor-default" },
    },
  },
);

export const stepMarker = cva(
  "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
  {
    variants: {
      state: {
        done: "bg-success text-white",
        current: "bg-accent text-accent-fg",
        upcoming: "border border-border-strong text-subtle",
      },
    },
  },
);
