import { cva, type VariantProps } from "class-variance-authority";

export const iconButtonStyles = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        ghost: "text-muted hover:bg-surface-2 hover:text-text",
        secondary: "border border-border-strong bg-surface text-muted shadow-sm hover:bg-surface-2 hover:text-text",
        active: "bg-accent-soft text-accent-ink",
      },
      size: { sm: "size-7", md: "size-8" },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export type IconButtonVariants = VariantProps<typeof iconButtonStyles>;
