import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";
import { DocumentRoot } from "@/screens/document/DocumentRoot";
import "@/styles/globals.css";

export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale });
  return { title: t("app.name") };
}

export default function LocaleLayout(props: { children: ReactNode; params: Promise<{ locale: string }> }) {
  return <DocumentRoot params={props.params}>{props.children}</DocumentRoot>;
}
