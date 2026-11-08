import { cva } from "class-variance-authority";

export const segmentedStyles = {
  root: cva("inline-flex items-center gap-0.5 rounded-lg bg-surface-3 p-0.5", {
    variants: { fullWidth: { true: "flex w-full", false: "" } },
    defaultVariants: { fullWidth: false },
  }),
  item: cva(
    "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium text-muted transition-colors hover:text-text disabled:pointer-events-none disabled:opacity-60 data-[state=on]:bg-surface data-[state=on]:text-text data-[state=on]:shadow-sm",
    {
      variants: { size: { sm: "h-6 px-2 text-xs", md: "h-7 px-2.5 text-[13px]" } },
      defaultVariants: { size: "md" },
    },
  ),
};
