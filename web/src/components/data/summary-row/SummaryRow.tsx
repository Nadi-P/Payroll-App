import type { ReactNode } from "react";
import { Text } from "@/components/typography/text/Text";
import { summaryRowStyles } from "./summaryRow.styles";

interface SummaryRowProps {
  label: string;
  value: ReactNode;
  tone?: "accent" | "neutral" | "success" | "danger";
  onPress?: () => void;
  title?: string;
}

/** A highlighted total line, such as net pay. */
export function SummaryRow({ label, value, tone, onPress, title }: SummaryRowProps) {
  const Tag = onPress ? "button" : "div";
  return (
    <Tag
      type={onPress ? "button" : undefined}
      onClick={onPress}
      title={title}
      className={summaryRowStyles({ tone, interactive: !!onPress })}
    >
      <Text weight="semibold" size="lg">{label}</Text>
      {value}
    </Tag>
  );
}
