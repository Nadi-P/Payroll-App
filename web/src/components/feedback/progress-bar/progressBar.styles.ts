import { cva, type VariantProps } from "class-variance-authority";

export const progressBarStyles = {
  track: "h-1.5 w-full overflow-hidden rounded-full bg-surface-3",
  fill: cva("h-full rounded-full transition-[inline-size] duration-500", {
    variants: {
      tone: { accent: "bg-accent", success: "bg-success", warning: "bg-warning", danger: "bg-danger" },
    },
    defaultVariants: { tone: "accent" },
  }),
};

export type ProgressBarVariants = VariantProps<typeof progressBarStyles.fill>;
