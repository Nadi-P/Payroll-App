"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/actions/button/Button";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { Badge } from "@/components/feedback/badge/Badge";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { Select } from "@/components/inputs/select/Select";
import { Money } from "@/components/typography/money/Money";
import { Text } from "@/components/typography/text/Text";
import type { DraftLine } from "./logic/entryDraft";
import { monthEntryStyles as s } from "./monthEntry.styles";

interface LineListEditorProps {
  lines: DraftLine[];
  onChange: (lines: DraftLine[]) => void;
  options: { value: string; label: string }[];
  /** Amounts the employee gets every month (employment terms); a line typed here overrides one. */
  standing: { code: string; label: string; amount: string }[];
  addLabel: string;
  readOnly?: boolean;
  /** Deductions have no quantity or rate. */
  amountsOnly?: boolean;
}

const round2 = (v: number) => String(Math.round(v * 100) / 100);

/** This month's lines of one kind: add, change or remove them; standing ones are shown too. */
export function LineListEditor({ lines, onChange, options, standing, addLabel, readOnly, amountsOnly }: LineListEditorProps) {
  const t = useTranslations();
  const set = (i: number, patch: Partial<DraftLine>) => {
    const next = lines.map((l, j) => (j === i ? { ...l, ...patch } : l));
    const line = next[i]!;
    // Quantity times rate gives the amount, unless the amount was typed by hand.
    if (("quantity" in patch || "rate" in patch) && line.quantity && line.rate)
      next[i] = { ...line, amount: round2(Number(line.quantity) * Number(line.rate)) };
    onChange(next);
  };
  const used = new Set(lines.map((l) => l.code));
  const free = options.filter((o) => !used.has(o.value));
  const typedCodes = new Set(lines.map((l) => l.code));

  return (
    <div className={s.group}>
      <div className={s.list}>
        <div className={s.listHead}>
          <Text size="xs" tone="muted">{t("monthEntry.item")}</Text>
          <Text size="xs" tone="muted">{amountsOnly ? "" : t("monthEntry.quantity")}</Text>
          <Text size="xs" tone="muted">{amountsOnly ? "" : t("monthEntry.rate")}</Text>
          <Text size="xs" tone="muted">{t("monthEntry.amount")}</Text>
          <div />
        </div>
        {standing.map((st) => (
          <div key={`standing-${st.code}`} className={s.standing}>
            <div className={s.standingName}>
              <Text truncate>{st.label}</Text>
              <Badge tone={typedCodes.has(st.code) ? "warning" : "outline"} label={typedCodes.has(st.code) ? t("monthEntry.overridden") : t("monthEntry.standing")} />
            </div>
            <Money value={st.amount} tone="muted" />
            <div />
          </div>
        ))}
        {lines.map((line, i) => (
          <div key={`${line.code}-${i}`} className={s.row}>
            <div className={s.rowWide}>
              <Select
                size="sm"
                ariaLabel={t("monthEntry.item")}
                value={line.code}
                disabled={readOnly}
                onChange={(code) => set(i, { code })}
                options={options.filter((o) => o.value === line.code || !used.has(o.value))}
              />
            </div>
            {amountsOnly ? (
              <>
                <div />
                <div />
              </>
            ) : (
              <>
                <NumberInput size="sm" align="end" ariaLabel={t("monthEntry.quantity")} value={line.quantity ?? null} disabled={readOnly} onCommit={(v) => set(i, { quantity: v })} />
                <NumberInput size="sm" align="end" ariaLabel={t("monthEntry.rate")} value={line.rate ?? null} disabled={readOnly} onCommit={(v) => set(i, { rate: v })} />
              </>
            )}
            <NumberInput size="sm" align="end" suffix="₪" ariaLabel={t("monthEntry.amount")} value={line.amount} disabled={readOnly} onCommit={(v) => set(i, { amount: v ?? "0" })} />
            <div className={s.end}>
              {readOnly ? null : (
                <IconButton size="sm" icon="trash" label={t("monthEntry.remove")} onPress={() => onChange(lines.filter((_, j) => j !== i))} />
              )}
            </div>
          </div>
        ))}
      </div>
      {readOnly || !free.length ? null : (
        <div>
          <Button variant="ghost" size="sm" icon="plus" label={addLabel} onPress={() => onChange([...lines, { code: free[0]!.value, amount: "0" }])} />
        </div>
      )}
    </div>
  );
}
