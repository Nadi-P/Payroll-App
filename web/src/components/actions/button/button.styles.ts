import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color,box-shadow] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg shadow-sm hover:bg-accent-hover",
        secondary: "border border-border-strong bg-surface text-text shadow-sm hover:bg-surface-2",
        ghost: "text-muted hover:bg-surface-2 hover:text-text",
        danger: "bg-danger text-white shadow-sm hover:bg-danger-hover",
        success: "bg-success text-white shadow-sm hover:opacity-90",
        soft: "bg-accent-soft text-accent-ink hover:bg-accent-soft/70",
        /** Hollow accent button: for repeated actions where a filled one would be too loud. */
        outline: "border border-accent bg-transparent text-accent-ink hover:bg-accent-soft",
        /** The one main action of a screen. */
        hero: "bg-accent text-accent-fg shadow-[0_10px_24px_-10px_var(--accent)] hover:bg-accent-hover hover:shadow-[0_12px_28px_-10px_var(--accent)]",
      },
      size: {
        sm: "h-7 px-2.5 text-[13px]",
        md: "h-8 px-3 text-[13px]",
        lg: "h-10 px-4 text-sm",
        xl: "h-12 rounded-lg px-6 text-[15px] font-semibold",
      },
      fullWidth: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "secondary", size: "md", fullWidth: false },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

/** Size and variant classes may override the base ones (radius, weight), so they are merged. */
export const buttonStyles = (props: ButtonVariants) => cn(buttonVariants(props));
