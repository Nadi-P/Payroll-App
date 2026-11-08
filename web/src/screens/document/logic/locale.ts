import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { directionOf, routing } from "@/i18n/routing";

/** Validate the locale from the URL and prepare it for static rendering. */
export async function resolveLocale(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return { locale, dir: directionOf(locale) };
}
