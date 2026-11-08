import { moneyStyles, type MoneyVariants } from "./money.styles";
import { useMoney } from "./useMoney";

interface MoneyProps extends MoneyVariants {
  value: string | number | null | undefined;
  signed?: boolean;
  compact?: boolean;
  colorBySign?: boolean;
}

export function Money({ value, size, tone, weight, signed, compact, colorBySign }: MoneyProps) {
  const money = useMoney(value, { signed, compact, colorBySign });
  return <bdi className={moneyStyles({ size, weight, tone: money.tone ?? tone })}>{money.text}</bdi>;
}
