import type { Preset } from "@/components/data/report-view/panel/panel.types";
import { normalizeConfig, type ReportConfig } from "@/components/data/report-view/reportView.types";

/**
 * A report's saved layouts and the user's last unsaved state, kept per user, client and report.
 * Stored in this browser until user settings move to the server.
 */
export interface StoredReport {
  presets: Preset[];
  defaultName: string | null;
  draft: ReportConfig | null;
}

const key = (userId: string, companyId: string, report: string) => `paypex:report:${userId}:${companyId}:${report}`;

export function loadReport(userId: string, companyId: string, report: string): StoredReport {
  try {
    const raw = window.localStorage.getItem(key(userId, companyId, report));
    const data = raw ? (JSON.parse(raw) as Partial<StoredReport>) : {};
    return {
      presets: (data.presets ?? []).map((p) => ({ name: p.name, config: normalizeConfig(p.config) })),
      defaultName: data.defaultName ?? null,
      draft: data.draft ? normalizeConfig(data.draft) : null,
    };
  } catch {
    return { presets: [], defaultName: null, draft: null };
  }
}

export function storeReport(userId: string, companyId: string, report: string, data: StoredReport): void {
  try {
    window.localStorage.setItem(key(userId, companyId, report), JSON.stringify(data));
  } catch {
    // Storage can be full or refused (private windows); layouts then last for this visit only.
  }
}
