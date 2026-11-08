import { cva } from "class-variance-authority";

export const spinnerStyles = cva(
  "inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70",
  { variants: { size: { sm: "size-3.5", md: "size-4", lg: "size-6" } }, defaultVariants: { size: "md" } },
);
