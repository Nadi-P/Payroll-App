import { cva, type VariantProps } from "class-variance-authority";

export const moneyStyles = cva("tabular-nums whitespace-nowrap [unicode-bidi:isolate]", {
  variants: {
    size: {
      sm: "text-[13px]",
      md: "text-sm",
      lg: "text-base",
      xl: "text-xl tracking-tight",
      display: "text-[28px] leading-9 tracking-tight",
    },
    tone: {
      default: "text-text",
      muted: "text-muted",
      positive: "text-success",
      negative: "text-danger",
      accent: "text-accent-ink",
    },
    weight: { regular: "font-normal", medium: "font-medium", semibold: "font-semibold" },
  },
  defaultVariants: { size: "md", tone: "default", weight: "regular" },
});

export type MoneyVariants = VariantProps<typeof moneyStyles>;
