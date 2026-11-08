"use client";

import { useTranslations } from "next-intl";
import { PageLoader } from "@/components/feedback/page-loader/PageLoader";

/** Nothing but the loading animation, held on screen for as long as you care to watch it. */
export function LoaderScreen() {
  const t = useTranslations();
  return <PageLoader visible label={t("shell.loading")} />;
}
