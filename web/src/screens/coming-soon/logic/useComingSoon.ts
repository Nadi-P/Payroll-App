"use client";

import { useTranslations } from "next-intl";
import type { IconName } from "@/components/typography/icon/icon.logic";

export type Feature = "migration" | "assistant" | "portal";

const ICONS: Record<Feature, IconName> = { migration: "upload", assistant: "sparkles", portal: "smartphone" };
const POINTS = 4;

export function useComingSoon(feature: Feature) {
  const t = useTranslations();
  return {
    t,
    icon: ICONS[feature],
    title: t(`comingSoon.${feature}.title`),
    body: t(`comingSoon.${feature}.body`),
    points: Array.from({ length: POINTS }, (_, i) => t(`comingSoon.${feature}.points.p${i + 1}`)),
  };
}
