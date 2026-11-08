import { cva } from "class-variance-authority";

export const textLinkStyles = cva(
  "inline-flex items-center gap-1 rounded-sm font-medium underline-offset-4 hover:underline",
  {
    variants: { tone: { accent: "text-accent-ink", default: "text-text", muted: "text-muted hover:text-text" } },
    defaultVariants: { tone: "accent" },
  },
);
