"use client";

import { Spinner } from "@/components/feedback/spinner/Spinner";
import { Card } from "@/components/surfaces/card/Card";
import { Money } from "@/components/typography/money/Money";
import { Text } from "@/components/typography/text/Text";
import { simulationStyles as s } from "./simulation.styles";

interface Row {
  key: string;
  label: string;
  before: number;
  after: number;
  /** A rise is bad news (tax, cost): shown in red rather than green. */
  lower?: boolean;
}

interface ComparisonCardProps {
  title: string;
  rows: Row[];
  labels: { now: string; after: string; change: string };
  busy?: boolean;
}

/** Figures now and with the changes, and the difference. */
export function ComparisonCard({ title, rows, labels, busy }: ComparisonCardProps) {
  return (
    <Card title={title} actions={busy ? <Spinner size="sm" /> : null}>
      <div className={s.compare}>
        <div className={s.compareHead}>
          <div />
          <div className={s.cell}><Text size="xs" tone="muted">{labels.now}</Text></div>
          <div className={s.cell}><Text size="xs" tone="muted">{labels.after}</Text></div>
          <div className={s.cell}><Text size="xs" tone="muted">{labels.change}</Text></div>
        </div>
        {rows.map((r) => {
          const change = Math.round((r.after - r.before) * 100) / 100;
          const good = r.lower ? change < 0 : change > 0;
          return (
            <div key={r.key} className={s.compareRow}>
              <Text>{r.label}</Text>
              <div className={s.cell}><Money value={r.before} tone="muted" /></div>
              <div className={s.cell}><Money value={r.after} weight="medium" /></div>
              <div className={s.cell}>
                {change ? <Money value={change} signed weight="semibold" tone={good ? "positive" : "negative"} /> : <Text tone="subtle">—</Text>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
