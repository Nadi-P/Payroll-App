import { cva, type VariantProps } from "class-variance-authority";

export const statusTagStyles = cva(
  "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold",
  {
    variants: {
      tone: {
        danger: "bg-danger-soft text-danger",
        warning: "bg-warning-soft text-warning",
        success: "bg-success-soft text-success",
        neutral: "bg-surface-2 text-muted",
        accent: "bg-accent-soft text-accent-ink",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type StatusTagVariants = VariantProps<typeof statusTagStyles>;
