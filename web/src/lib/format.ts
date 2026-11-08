/** Locale-aware formatting. Western digits everywhere, as Israeli payslips use them. */

const INTL_LOCALE: Record<string, string> = {
  he: "he-IL",
  en: "en-IL",
  ar: "ar-IL-u-nu-latn",
  ru: "ru-RU",
};

function intlLocale(locale: string): string {
  return INTL_LOCALE[locale] ?? "en-IL";
}

const cache = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + JSON.stringify(options);
  let format = cache.get(key);
  if (!format) {
    format = new Intl.NumberFormat(intlLocale(locale), { numberingSystem: "latn", ...options });
    cache.set(key, format);
  }
  return format;
}

export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatMoney(
  value: string | number | null | undefined,
  locale: string,
  options: { signed?: boolean; compact?: boolean } = {},
): string {
  const n = toNumber(value);
  if (n === null) return "—";
  return numberFormat(locale, {
    style: "currency",
    currency: "ILS",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: options.compact ? 0 : 2,
    maximumFractionDigits: options.compact ? 0 : 2,
    notation: options.compact ? "compact" : "standard",
    signDisplay: options.signed ? "exceptZero" : "auto",
  }).format(n);
}

export function formatNumber(
  value: string | number | null | undefined,
  locale: string,
  maxFractionDigits = 2,
): string {
  const n = toNumber(value);
  if (n === null) return "—";
  return numberFormat(locale, { maximumFractionDigits: maxFractionDigits }).format(n);
}

export function formatPercent(value: string | number | null | undefined, locale: string): string {
  const n = toNumber(value);
  if (n === null) return "—";
  return numberFormat(locale, { maximumFractionDigits: 2 }).format(n) + "%";
}

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    numberingSystem: "latn",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatPeriod(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
    numberingSystem: "latn",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** A month's name alone, e.g. "March": for tables and charts that cover a single year. */
export function formatMonth(month: number, locale: string, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: style, timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, month - 1, 1)),
  );
}
