import type { ReactNode } from "react";
import { textStyles, type TextVariants } from "./text.styles";

interface TextProps extends TextVariants {
  as?: "span" | "p" | "div";
  title?: string;
  children: ReactNode;
}

export function Text({ as: Tag = "span", size, tone, weight, truncate, numeric, caps, title, children }: TextProps) {
  return (
    <Tag className={textStyles({ size, tone, weight, truncate, numeric, caps })} title={title}>
      {children}
    </Tag>
  );
}
