import { cva } from "class-variance-authority";

export const reportListStyles = {
  root: "print:hidden",
  /** Small screens: one dropdown instead of the list. */
  compact: "lg:hidden",
  panel: "hidden flex-col gap-5 rounded-xl border border-border bg-surface p-2.5 shadow-sm lg:flex",
  group: "flex flex-col gap-0.5",
  groupTitle: "truncate px-2.5 pb-1 pt-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-subtle",
  item: cva(
    "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[13.5px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
    {
      variants: {
        active: {
          true: "bg-accent-soft text-accent-ink",
          false: "text-muted hover:bg-surface-2 hover:text-text",
        },
      },
    },
  ),
  label: "flex min-w-0 flex-1 flex-col leading-tight",
  name: "truncate",
  meta: "truncate pt-0.5 text-[12px] font-normal text-subtle",
  dot: cva("size-2 shrink-0 rounded-full", {
    variants: {
      tone: {
        success: "bg-success",
        warning: "bg-warning",
        danger: "bg-danger",
        neutral: "bg-border-strong",
      },
    },
  }),
};
