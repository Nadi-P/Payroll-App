import { cva } from "class-variance-authority";

export const flagStyles = cva("shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgb(0_0_0/0.08)]", {
  variants: { size: { sm: "h-3 w-4", md: "h-[15px] w-5" } },
  defaultVariants: { size: "md" },
});
