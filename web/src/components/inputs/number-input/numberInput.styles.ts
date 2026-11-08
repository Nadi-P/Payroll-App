import { cva } from "class-variance-authority";
import { fieldBox } from "../input.styles";

export const numberInputStyles = {
  wrap: "relative flex w-full items-center",
  input: fieldBox,
  align: cva("tabular-nums", {
    variants: { align: { start: "text-start", end: "text-end" }, suffix: { true: "pe-7", false: "" } },
    defaultVariants: { align: "end", suffix: false },
  }),
  suffix: "pointer-events-none absolute end-2 text-[12px] text-subtle",
};
