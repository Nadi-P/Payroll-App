"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/routing";
import type { FlagCode } from "@/components/typography/flag/Flag";

const FLAGS: Record<Locale, FlagCode> = { he: "il", en: "us", ar: "arab-league", ru: "ru" };

export function usePreferences() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [, startTransition] = useTransition();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const changeLocale = (next: Locale) =>
    startTransition(() => {
      // @ts-expect-error -- params of dynamic routes are passed through unchanged
      router.replace({ pathname, params }, { locale: next });
    });

  return {
    locale,
    theme: theme ?? "system",
    /** Known only in the browser; the server always renders the light icon. */
    themeIcon: mounted && resolvedTheme === "dark" ? ("moon" as const) : ("sun" as const),
    toggleTheme: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    languageItems: LOCALES.map((l) => ({
      id: l,
      label: t(`locales.${l}`),
      flag: FLAGS[l],
      checked: l === locale,
      onSelect: () => changeLocale(l),
    })),
    themeItems: (["light", "dark", "system"] as const).map((v) => ({
      id: v,
      label: t(`shell.theme.${v}`),
      icon: ({ light: "sun", dark: "moon", system: "monitor" } as const)[v],
      checked: (theme ?? "system") === v,
      onSelect: () => setTheme(v),
    })),
    changeLocale,
  };
}
