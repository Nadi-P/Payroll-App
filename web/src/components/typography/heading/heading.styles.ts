import { cva, type VariantProps } from "class-variance-authority";

export const headingStyles = cva("text-text tracking-tight", {
  variants: {
    level: {
      1: "text-[24px] leading-8 font-semibold",
      2: "text-[15px] leading-6 font-semibold",
      3: "text-[13px] leading-5 font-semibold",
    },
  },
  defaultVariants: { level: 2 },
});

export type HeadingVariants = VariantProps<typeof headingStyles>;
