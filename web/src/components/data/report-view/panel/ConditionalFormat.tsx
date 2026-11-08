"use client";

import { Button } from "@/components/actions/button/Button";
import { Field } from "@/components/inputs/field/Field";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { Select } from "@/components/inputs/select/Select";
import { Switch } from "@/components/inputs/switch/Switch";
import type { StatKind, Threshold, ThresholdOperator } from "../reportView.types";
import type { PanelLabels } from "./panel.types";
import { reportPanelStyles as s } from "./reportPanel.styles";

interface ConditionalFormatProps {
  numeric: boolean;
  threshold: Threshold | undefined;
  onThreshold: (t: Threshold | null) => void;
  stat: StatKind | undefined;
  onStat: (kind: StatKind | null) => void;
  /** Table mode only: highlight values that appear more than once. */
  duplicates?: boolean;
  onDuplicates?: (on: boolean) => void;
  labels: PanelLabels;
}

const OPERATORS: ThresholdOperator[] = [">", ">=", "<", "<=", "==", "between"];
const STATS: (StatKind | "none")[] = ["none", "top10", "top10pct", "bottom10", "bottom10pct", "aboveAvg", "belowAvg"];

/** Highlight cells that meet a condition, stand out statistically, or repeat. */
export function ConditionalFormat({ numeric, threshold, onThreshold, stat, onStat, duplicates, onDuplicates, labels }: ConditionalFormatProps) {
  const L = labels.format;
  const op = threshold?.operator;
  const update = (patch: Partial<Threshold>) => {
    const base: Threshold = threshold ?? { operator: ">", value1: 0 };
    onThreshold({ ...base, ...patch });
  };
  return (
    <div className={s.section}>
      <div className={s.sectionTitle}>{L.title}</div>
      {numeric ? (
        <>
          <Field label={L.threshold}>
            <Select
              size="sm"
              ariaLabel={L.operator}
              placeholder={L.operator}
              value={op}
              onChange={(v) => update({ operator: v as ThresholdOperator })}
              options={OPERATORS.map((o) => ({ value: o, label: L.operators[o] }))}
            />
          </Field>
          {threshold ? (
            <div className={s.grid2}>
              <Field label={L.value}>
                <NumberInput size="sm" value={String(threshold.value1)} onCommit={(v) => update({ value1: Number(v ?? 0) })} />
              </Field>
              {op === "between" ? (
                <Field label={L.to}>
                  <NumberInput size="sm" value={threshold.value2 === undefined ? null : String(threshold.value2)} onCommit={(v) => update({ value2: Number(v ?? 0) })} />
                </Field>
              ) : null}
            </div>
          ) : null}
          <Field label={L.stat}>
            <Select
              size="sm"
              ariaLabel={L.stat}
              value={stat ?? "none"}
              onChange={(v) => onStat(v === "none" ? null : (v as StatKind))}
              options={STATS.map((k) => ({ value: k, label: L.stats[k] }))}
            />
          </Field>
        </>
      ) : null}
      {onDuplicates ? <Switch checked={!!duplicates} onChange={onDuplicates} label={L.duplicates} /> : null}
      {threshold || stat || duplicates ? (
        <div>
          <Button
            variant="ghost"
            size="sm"
            icon="x"
            label={L.clear}
            onPress={() => {
              onThreshold(null);
              onStat(null);
              onDuplicates?.(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
