import type { IconName } from "@/components/typography/icon/icon.logic";

export interface ReportListItem {
  id: string;
  label: string;
  icon?: IconName;
  /** A short second line, e.g. a due date. */
  meta?: string;
  /** A status dot at the end of the row. */
  tone?: "success" | "warning" | "danger" | "neutral";
  /** Spoken with the dot, since a color alone says nothing to a screen reader. */
  toneLabel?: string;
}

export interface ReportListGroup {
  id: string;
  title: string;
  items: ReportListItem[];
}
