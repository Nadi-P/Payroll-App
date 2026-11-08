import { cva, type VariantProps } from "class-variance-authority";

export const numberTextStyles = cva("tabular-nums whitespace-nowrap [unicode-bidi:isolate]", {
  variants: {
    tone: { default: "text-text", muted: "text-muted", subtle: "text-subtle" },
    size: { sm: "text-[13px]", md: "text-sm", lg: "text-base" },
  },
  defaultVariants: { tone: "default", size: "md" },
});

export const unitStyles = "ms-1 text-subtle";

export type NumberTextVariants = VariantProps<typeof numberTextStyles>;
