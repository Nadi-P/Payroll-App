import { useLocale } from "next-intl";
import { formatNumber, formatPercent } from "@/lib/format";

export function useNumberText(value: string | number | null | undefined, percent: boolean, digits: number) {
  const locale = useLocale();
  return percent ? formatPercent(value, locale) : formatNumber(value, locale, digits);
}
