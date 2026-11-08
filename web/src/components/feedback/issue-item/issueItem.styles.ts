import { cva } from "class-variance-authority";

export const issueItemStyles = cva(
  "group flex w-full items-start gap-3 px-3.5 py-3 text-start transition-colors",
  {
    variants: {
      interactive: { true: "cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2", false: "" },
    },
    defaultVariants: { interactive: false },
  },
);

export const severityMarker = cva("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md", {
  variants: {
    severity: {
      error: "bg-danger-soft text-danger",
      warning: "bg-warning-soft text-warning",
      info: "bg-info-soft text-info",
    },
  },
});

export const issueItemParts = {
  body: "flex min-w-0 flex-1 flex-col gap-0.5",
  titleRow: "flex flex-wrap items-center gap-2",
  action: "shrink-0 self-center",
};
