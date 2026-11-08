import { cn } from "@/lib/cn";
import { fieldBox } from "../input.styles";

export const searchInputStyles = {
  wrap: "relative flex w-full items-center",
  icon: "pointer-events-none absolute start-2.5 text-subtle",
  input: (size?: "sm" | "md" | "lg") => cn(fieldBox({ size }), "ps-8"),
};
