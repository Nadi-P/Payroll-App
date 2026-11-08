import { dateTextStyles } from "./dateText.styles";
import { useDateText } from "./useDateText";

interface DateTextProps {
  /** An ISO date, or a pay period to show as "month year". */
  value?: string | null;
  period?: { year: number; month: number };
}

export function DateText({ value, period }: DateTextProps) {
  const text = useDateText(value, period);
  return <bdi className={dateTextStyles}>{text}</bdi>;
}
