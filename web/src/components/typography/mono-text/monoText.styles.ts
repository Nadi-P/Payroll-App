import { cva } from "class-variance-authority";

export const monoTextStyles = cva("font-mono text-[12px] tabular-nums text-text [unicode-bidi:isolate]", {
  variants: {
    block: {
      true: "block overflow-x-auto rounded-lg border border-border bg-surface-2 px-3 py-2.5 leading-5 [direction:ltr] [text-align:left] whitespace-pre-wrap",
      false: "",
    },
  },
  defaultVariants: { block: false },
});
