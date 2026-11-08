import { cva } from "class-variance-authority";

export const avatarStyles = cva(
  "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
  {
    variants: {
      size: { sm: "size-6 text-[10px]", md: "size-8 text-[12px]", lg: "size-12 text-base", xl: "size-[72px] text-2xl" },
      hue: {
        0: "bg-accent-soft text-accent-ink",
        1: "bg-success-soft text-success",
        2: "bg-warning-soft text-warning",
        3: "bg-info-soft text-info",
        4: "bg-danger-soft text-danger",
        5: "bg-surface-3 text-muted",
      },
    },
    defaultVariants: { size: "md", hue: 0 },
  },
);
