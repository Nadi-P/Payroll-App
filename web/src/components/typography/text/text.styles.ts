import { cva, type VariantProps } from "class-variance-authority";

export const textStyles = cva("", {
  variants: {
    size: {
      xs: "text-[11px] leading-4",
      sm: "text-[13px] leading-5",
      md: "text-sm leading-5",
      lg: "text-base leading-6",
      xl: "text-lg leading-7",
    },
    tone: {
      default: "text-text",
      muted: "text-muted",
      subtle: "text-subtle",
      accent: "text-accent-ink",
      danger: "text-danger",
      warning: "text-warning",
      success: "text-success",
      inherit: "",
    },
    weight: {
      regular: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
    },
    truncate: { true: "block min-w-0 truncate", false: "" },
    numeric: { true: "tabular-nums", false: "" },
    caps: { true: "uppercase tracking-wide", false: "" },
  },
  defaultVariants: { size: "md", tone: "default", weight: "regular" },
});

export type TextVariants = VariantProps<typeof textStyles>;
