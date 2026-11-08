import { useLocale } from "next-intl";
import { formatDate, formatPeriod } from "@/lib/format";

export function useDateText(iso: string | null | undefined, period?: { year: number; month: number }) {
  const locale = useLocale();
  return period ? formatPeriod(period.year, period.month, locale) : formatDate(iso, locale);
}
