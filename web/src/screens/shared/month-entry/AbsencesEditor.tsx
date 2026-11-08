"use client";

import { useTranslations } from "next-intl";
import { Field } from "@/components/inputs/field/Field";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { NumberText } from "@/components/typography/number-text/NumberText";
import { Text } from "@/components/typography/text/Text";
import type { EditorProps } from "./logic/editorProps";
import { sickCount, withLeave, withSickDays } from "./logic/entryDraft";
import { monthEntryStyles as s } from "./monthEntry.styles";

const num = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? null : String(v));
const nonZero = (v: string | null) => (v && Number(v) !== 0 ? v : null);

/** The four kinds of absence: vacation, sick leave, recuperation and reserve duty (miluim). */
export function AbsencesEditor({ entry, onChange, record, slip, readOnly }: EditorProps) {
  const t = useTranslations();
  const leave = entry.leave ?? {};
  const b = slip?.balances;

  const card = (
    kind: "vacation" | "sick" | "recuperation",
    rows: { opening: string | undefined; accrued: string | undefined; balance: string | undefined },
    adjustment: string | null,
    setAdjustment: (v: string | null) => void,
    used: string | null,
    setUsed: ((v: string | null) => void) | null,
  ) => (
    <div className={s.balance}>
      <div className={s.balanceHead}>
        <Text weight="semibold">{t(`absences.${kind}`)}</Text>
        <Text size="xs" tone="subtle">{t("absences.days")}</Text>
      </div>
      <div className={s.balanceRow}><Text tone="muted">{t("absences.previous")}</Text><NumberText value={rows.opening ?? null} /></div>
      <Field label={t("absences.adjustment")}>
        <NumberInput size="sm" align="end" value={adjustment} disabled={readOnly} onCommit={setAdjustment} />
      </Field>
      <div className={s.balanceRow}><Text tone="muted">{t("absences.accrued")}</Text><NumberText value={rows.accrued ?? null} /></div>
      {setUsed ? (
        <Field label={t("absences.used")}>
          <NumberInput size="sm" align="end" value={used} disabled={readOnly} onCommit={setUsed} />
        </Field>
      ) : (
        <div className={s.balanceRow}><Text tone="muted">{t("absences.used")}</Text><NumberText value={used} /></div>
      )}
      <div className={s.balanceRow}><Text weight="medium">{t("absences.balance")}</Text><Text weight="semibold" numeric><NumberText value={rows.balance ?? null} /></Text></div>
    </div>
  );

  return (
    <div className={s.root}>
      <div className={s.balances}>
        {card(
          "vacation",
          { opening: b?.vacation_opening ?? leave.vacation_opening, accrued: b?.vacation_accrued, balance: b?.vacation },
          nonZero(num(leave.vacation_adjustment)),
          (v) => onChange(withLeave(entry, { vacation_adjustment: v ?? "0" })),
          nonZero(num(leave.vacation_days_used)),
          (v) => onChange(withLeave(entry, { vacation_days_used: v ?? "0" })),
        )}
        {card(
          "sick",
          { opening: b?.sick_opening ?? leave.sick_opening, accrued: b?.sick_accrued, balance: b?.sick },
          nonZero(num(leave.sick_adjustment)),
          (v) => onChange(withLeave(entry, { sick_adjustment: v ?? "0" })),
          sickCount(entry) ? String(sickCount(entry)) : null,
          (v) => onChange(withSickDays(entry, v)),
        )}
        {card(
          "recuperation",
          { opening: b?.recuperation_opening ?? leave.recuperation_opening, accrued: b?.recuperation_accrued, balance: b?.recuperation },
          nonZero(num(leave.recuperation_adjustment)),
          (v) => onChange(withLeave(entry, { recuperation_adjustment: v ?? "0" })),
          nonZero(num(b?.recuperation_used)),
          null,
        )}
      </div>
      <div className={s.fields}>
        <Field label={t("absences.reserveDays")}>
          <NumberInput
            value={leave.reserve_days ? String(leave.reserve_days) : null}
            disabled={readOnly}
            onCommit={(v) => onChange(withLeave(entry, { reserve_days: v === null ? 0 : Math.round(Number(v)) }))}
          />
        </Field>
        {record.employee.kind === "monthly" ? (
          <Field label={t("absences.unpaid")}>
            <NumberInput
              value={nonZero(num(leave.unpaid_absence_days))}
              disabled={readOnly}
              onCommit={(v) => onChange(withLeave(entry, { unpaid_absence_days: v ?? "0" }))}
            />
          </Field>
        ) : null}
      </div>
    </div>
  );
}
