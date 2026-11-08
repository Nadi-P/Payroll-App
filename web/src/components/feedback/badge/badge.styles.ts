import { cva, type VariantProps } from "class-variance-authority";

export const badgeStyles = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-medium tabular-nums",
  {
    variants: {
      tone: {
        neutral: "bg-surface-3 text-muted",
        accent: "bg-accent-soft text-accent-ink",
        danger: "bg-danger-soft text-danger",
        warning: "bg-warning-soft text-warning",
        success: "bg-success-soft text-success",
        info: "bg-info-soft text-info",
        outline: "border border-border-strong text-muted",
      },
      size: { sm: "h-5 px-1.5 text-[11px]", md: "h-6 px-2 text-xs" },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export const dotStyles = "size-1.5 rounded-full bg-current";

export type BadgeVariants = VariantProps<typeof badgeStyles>;
