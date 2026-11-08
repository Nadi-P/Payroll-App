import { cva } from "class-variance-authority";

export const cardStyles = {
  root: cva("flex min-w-0 flex-col rounded-xl border bg-surface shadow-sm", {
    variants: {
      tone: {
        default: "border-border",
        accent: "border-accent/30",
        danger: "border-danger/30",
        warning: "border-warning/30",
        success: "border-success/30",
        done: "border-success/70 shadow-glow-success",
      },
      interactive: { true: "transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md", false: "" },
    },
    defaultVariants: { tone: "default", interactive: false },
  }),
  header: "flex items-start justify-between gap-3 px-4 pb-3 pt-3.5",
  headerText: "flex min-w-0 flex-col gap-0.5",
  actions: "flex shrink-0 items-center gap-1.5",
  body: cva("min-w-0", {
    variants: {
      padded: { true: "px-4 pb-4", false: "" },
      headless: { true: "", false: "" },
      divided: { true: "border-t border-border", false: "" },
    },
    compoundVariants: [{ padded: true, headless: true, className: "pt-4" }],
    defaultVariants: { padded: true, headless: false, divided: false },
  }),
  footer: "flex items-center justify-between gap-3 border-t border-border px-4 py-2.5",
};
