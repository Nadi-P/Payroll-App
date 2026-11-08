import { useLocale } from "next-intl";
import { formatMoney, toNumber } from "@/lib/format";

export function useMoney(
  value: string | number | null | undefined,
  options: { signed?: boolean; compact?: boolean; colorBySign?: boolean },
) {
  const locale = useLocale();
  const n = toNumber(value);
  const tone = options.colorBySign && n !== null && n !== 0 ? (n > 0 ? "positive" : "negative") : undefined;
  return { text: formatMoney(value, locale, options), tone } as const;
}
