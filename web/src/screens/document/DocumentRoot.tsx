import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { AppProviders } from "@/providers/AppProviders";
import { documentStyles as s } from "./document.styles";
import { resolveLocale } from "./logic/locale";

interface DocumentRootProps {
  params: Promise<{ locale: string }>;
  children: ReactNode;
}

export async function DocumentRoot({ params, children }: DocumentRootProps) {
  const { locale, dir } = await resolveLocale(params);
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={s.html}>
      <body className={s.body}>
        <NextIntlClientProvider>
          <AppProviders dir={dir}>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
