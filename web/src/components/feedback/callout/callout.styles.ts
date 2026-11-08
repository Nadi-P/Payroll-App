import { cva, type VariantProps } from "class-variance-authority";

export const calloutStyles = cva("flex items-start gap-3 rounded-lg border px-3.5 py-3", {
  variants: {
    tone: {
      info: "border-info/25 bg-info-soft",
      warning: "border-warning/25 bg-warning-soft",
      danger: "border-danger/25 bg-danger-soft",
      success: "border-success/25 bg-success-soft",
      neutral: "border-border bg-surface-2",
    },
  },
  defaultVariants: { tone: "info" },
});

export const calloutParts = {
  icon: "mt-0.5",
  body: "flex min-w-0 flex-1 flex-col gap-0.5",
  actions: "flex shrink-0 items-center gap-2",
};

export type CalloutVariants = VariantProps<typeof calloutStyles>;
