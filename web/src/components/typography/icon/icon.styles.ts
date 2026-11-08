import { cva, type VariantProps } from "class-variance-authority";

export const iconStyles = cva("shrink-0", {
  variants: {
    size: { xs: "size-3", sm: "size-3.5", md: "size-4", lg: "size-5", xl: "size-6" },
    tone: {
      inherit: "",
      muted: "text-muted",
      subtle: "text-subtle",
      accent: "text-accent-ink",
      danger: "text-danger",
      warning: "text-warning",
      success: "text-success",
      info: "text-info",
    },
    mirror: { true: "rtl:-scale-x-100", false: "" },
  },
  defaultVariants: { size: "md", tone: "inherit", mirror: false },
});

export type IconVariants = VariantProps<typeof iconStyles>;
