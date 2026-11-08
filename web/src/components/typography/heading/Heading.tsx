import type { ReactNode } from "react";
import { headingStyles } from "./heading.styles";

interface HeadingProps {
  level?: 1 | 2 | 3;
  children: ReactNode;
}

export function Heading({ level = 2, children }: HeadingProps) {
  const Tag = ({ 1: "h1", 2: "h2", 3: "h3" } as const)[level];
  return <Tag className={headingStyles({ level })}>{children}</Tag>;
}
