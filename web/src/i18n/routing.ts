import { defineRouting } from "next-intl/routing";

export const LOCALES = ["he", "en", "ar", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const RTL_LOCALES: readonly Locale[] = ["he", "ar"];

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "he",
});

export function directionOf(locale: string): "rtl" | "ltr" {
  return (RTL_LOCALES as readonly string[]).includes(locale) ? "rtl" : "ltr";
}
