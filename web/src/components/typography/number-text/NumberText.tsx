import { numberTextStyles, unitStyles, type NumberTextVariants } from "./numberText.styles";
import { useNumberText } from "./useNumberText";

interface NumberTextProps extends NumberTextVariants {
  value: string | number | null | undefined;
  unit?: string;
  percent?: boolean;
  digits?: number;
}

export function NumberText({ value, unit, percent = false, digits = 2, tone, size }: NumberTextProps) {
  const text = useNumberText(value, percent, digits);
  return (
    <bdi className={numberTextStyles({ tone, size })}>
      {text}
      {unit ? <span className={unitStyles}>{unit}</span> : null}
    </bdi>
  );
}
