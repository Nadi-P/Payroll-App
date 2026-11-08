import { cva } from "class-variance-authority";

/** Shared look of every text-like field, so all inputs line up exactly. */
export const fieldBox = cva(
  "w-full min-w-0 rounded-md border bg-surface text-text shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-subtle focus:border-accent focus:ring-3 focus:ring-ring disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted",
  {
    variants: {
      size: { sm: "h-7 px-2 text-[13px]", md: "h-8 px-2.5 text-[13px]", lg: "h-10 px-3 text-sm" },
      invalid: { true: "border-danger focus:border-danger", false: "border-border-strong" },
    },
    defaultVariants: { size: "md", invalid: false },
  },
);
