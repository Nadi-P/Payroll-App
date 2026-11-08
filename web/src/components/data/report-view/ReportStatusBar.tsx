"use client";

import { reportTableStyles as s } from "./reportView.styles";
import type { ReportLabels } from "./reportView.types";

interface ReportStatusBarProps {
  rows: number;
  stats: { count: number; sum: number | null; average: number | null; ratio: number | null } | null;
  labels: ReportLabels;
  /** Optional row-count label, e.g. "1,240 rows". */
  rowsLabel?: string;
}

const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });

/** Under the table: the number of rows, and the sum, average and count of the selected cells. */
export function ReportStatusBar({ rows, stats, labels, rowsLabel }: ReportStatusBarProps) {
  return (
    <div className={s.status} aria-live="polite">
      <div className={s.statusItem}>
        <span className={s.statusValue}>{fmt(rows)}</span>
        {rowsLabel ? <span>{rowsLabel}</span> : null}
      </div>
      <div className={s.statusSpacer} />
      {stats ? (
        <>
          <div className={s.statusItem}>
            <span>{labels.selection.count}</span>
            <span className={s.statusValue}>{fmt(stats.count)}</span>
          </div>
          {stats.sum !== null ? (
            <div className={s.statusItem}>
              <span>{labels.selection.sum}</span>
              <span className={s.statusValue}>{fmt(stats.sum)}</span>
            </div>
          ) : null}
          {stats.average !== null ? (
            <div className={s.statusItem}>
              <span>{labels.selection.average}</span>
              <span className={s.statusValue}>{fmt(stats.average)}</span>
            </div>
          ) : null}
          {stats.ratio !== null ? (
            <div className={s.statusItem}>
              <span>{labels.selection.ratio}</span>
              <span className={s.statusValue}>{`${fmt(stats.ratio)}%`}</span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
