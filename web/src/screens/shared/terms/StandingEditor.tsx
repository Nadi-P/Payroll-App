"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/actions/button/Button";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { DateInput } from "@/components/inputs/date-input/DateInput";
import { Field } from "@/components/inputs/field/Field";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { Select } from "@/components/inputs/select/Select";
import type { StandingLine } from "@/api/types.generated";
import { withStanding, type TermsProps } from "./logic/termsDraft";
import { termsStyles as s } from "./terms.styles";

interface StandingEditorProps extends TermsProps {
  options: { value: string; label: string }[];
}

/** Amounts paid, imputed or deducted every month until further notice: a car, a loan, meals. */
export function StandingEditor({ record, onChange, readOnly, options }: StandingEditorProps) {
  const t = useTranslations();
  const lines = record.standing ?? [];
  const set = (i: number, patch: Partial<StandingLine>) =>
    onChange(withStanding(record, lines.map((x, j) => (j === i ? { ...x, ...patch } : x))));
  return (
    <div className={s.root}>
      {lines.length === 0 ? (
        <EmptyState icon="list-checks" title={t("profile.standing.empty")} />
      ) : (
        <div className={s.list}>
          {lines.map((line, i) => (
            <div key={i} className={s.standingRow}>
              <Field label={t("payroll.entry.component")}>
                <Select ariaLabel={t("payroll.entry.component")} value={line.code} disabled={readOnly} onChange={(v) => set(i, { code: v })} options={options} />
              </Field>
              <Field label={t("payroll.entry.amount")}>
                <NumberInput value={line.amount} suffix="₪" disabled={readOnly} onCommit={(v) => set(i, { amount: v ?? "0" })} />
              </Field>
              <Field label={t("profile.standing.from")}>
                <DateInput value={line.valid_from ?? null} disabled={readOnly} onChange={(v) => set(i, { valid_from: v })} />
              </Field>
              <Field label={t("profile.standing.to")}>
                <DateInput value={line.valid_to ?? null} disabled={readOnly} onChange={(v) => set(i, { valid_to: v })} />
              </Field>
              <div className={s.remove}>
                {readOnly ? null : (
                  <IconButton icon="trash" label={t("profile.standing.remove")} onPress={() => onChange(withStanding(record, lines.filter((_, j) => j !== i)))} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {readOnly ? null : (
        <div>
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            label={t("profile.standing.add")}
            onPress={() => onChange(withStanding(record, [...lines, { code: options[0]?.value ?? "BONUS", amount: "0" }]))}
          />
        </div>
      )}
    </div>
  );
}
