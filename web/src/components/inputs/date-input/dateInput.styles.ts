import { cn } from "@/lib/cn";
import { fieldBox } from "../input.styles";

export const dateInputStyles = (opts: { size?: "sm" | "md" | "lg"; invalid?: boolean }) =>
  cn(fieldBox(opts), "tabular-nums [color-scheme:inherit]");
