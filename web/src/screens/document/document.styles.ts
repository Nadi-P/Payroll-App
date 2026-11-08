import { cn } from "@/lib/cn";
import { plex, plexArabic, plexHebrew, plexMono } from "./fonts";

export const documentStyles = {
  html: cn(plex.variable, plexHebrew.variable, plexArabic.variable, plexMono.variable, "h-full"),
  body: "min-h-full bg-bg text-text",
};
