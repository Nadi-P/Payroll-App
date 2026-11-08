"use client";

import { useTranslations } from "next-intl";
import { Field } from "@/components/inputs/field/Field";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { hoursOf } from "@/screens/shared/logic/entryEditing";
import { LineListEditor } from "./LineListEditor";
import type { EditorProps } from "./logic/editorProps";
import { enterable, linesOf, withAllowances, withHours, withLines } from "./logic/entryDraft";
import { monthEntryStyles as s } from "./monthEntry.styles";

/** Cash pay: hours, travel and every pay item typed this month. */
export function PaymentsEditor({ entry, onChange, record, catalog, nameOf, readOnly }: EditorProps) {
  const t = useTranslations();
  const hourly = record.employee.kind === "hourly";
  const options = enterable(catalog, "earning").map((c) => ({ value: c.code, label: nameOf(c.code) }));
  const earningCodes = new Set(options.map((o) => o.value));
  const hours = hoursOf(entry);
  return (
    <div className={s.root}>
      <div className={s.fields}>
        {hourly ? (
          <Field label={t("monthEntry.hours")}>
            <NumberInput value={hours ? String(hours) : null} disabled={readOnly} onCommit={(v) => onChange(withHours(entry, v))} />
          </Field>
        ) : null}
        <Field label={t("monthEntry.travel")}>
          <NumberInput
            suffix="₪"
            value={entry.allowances?.travel_daily_cost ?? null}
            disabled={readOnly}
            onCommit={(v) => onChange(withAllowances(entry, { travel_daily_cost: v }))}
          />
        </Field>
        <Field label={t("monthEntry.attendance")}>
          <NumberInput
            value={entry.allowances?.attendance_days == null ? null : String(entry.allowances.attendance_days)}
            disabled={readOnly}
            onCommit={(v) => onChange(withAllowances(entry, { attendance_days: v === null ? null : Math.round(Number(v)) }))}
          />
        </Field>
      </div>
      <LineListEditor
        lines={linesOf(entry, "earning", catalog)}
        onChange={(lines) => onChange(withLines(entry, "earning", lines, catalog))}
        options={options}
        standing={(record.standing ?? []).filter((x) => earningCodes.has(x.code)).map((x) => ({ code: x.code, label: nameOf(x.code), amount: x.amount }))}
        addLabel={t("monthEntry.addPayment")}
        readOnly={readOnly}
      />
    </div>
  );
}
