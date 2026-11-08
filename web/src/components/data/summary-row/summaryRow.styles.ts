import { cva } from "class-variance-authority";

export const summaryRowStyles = cva(
  "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-start transition-colors",
  {
    variants: {
      tone: { accent: "bg-accent-soft", neutral: "bg-surface-2", success: "bg-success-soft", danger: "bg-danger-soft" },
      interactive: { true: "cursor-pointer hover:brightness-[0.97] dark:hover:brightness-110", false: "" },
    },
    defaultVariants: { tone: "accent", interactive: false },
  },
);
