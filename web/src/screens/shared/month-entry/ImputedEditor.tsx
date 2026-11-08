"use client";

import { useTranslations } from "next-intl";
import { Field } from "@/components/inputs/field/Field";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { Select } from "@/components/inputs/select/Select";
import { Switch } from "@/components/inputs/switch/Switch";
import { LineListEditor } from "./LineListEditor";
import type { EditorProps } from "./logic/editorProps";
import { enterable, linesOf, withAllowances, withLines } from "./logic/entryDraft";
import { monthEntryStyles as s } from "./monthEntry.styles";

const CAR_TYPES = ["none", "electric", "plug_in_hybrid", "hybrid"] as const;

/** Imputed income (zkifot): value received in kind, taxed but not paid in cash. */
export function ImputedEditor({ entry, onChange, record, catalog, nameOf, readOnly }: EditorProps) {
  const t = useTranslations();
  const options = enterable(catalog, "benefit").map((c) => ({ value: c.code, label: nameOf(c.code) }));
  const codes = new Set(options.map((o) => o.value));
  const a = entry.allowances ?? {};
  return (
    <div className={s.root}>
      <div className={s.fields}>
        <Field label={t("monthEntry.carPrice")}>
          <NumberInput suffix="₪" value={a.car_list_price ?? null} disabled={readOnly} onCommit={(v) => onChange(withAllowances(entry, { car_list_price: v }))} />
        </Field>
        <Field label={t("monthEntry.carType")}>
          <Select
            ariaLabel={t("monthEntry.carType")}
            value={a.car_type ?? "none"}
            disabled={readOnly || !a.car_list_price}
            onChange={(v) => onChange(withAllowances(entry, { car_type: v === "none" ? null : v }))}
            options={CAR_TYPES.map((c) => ({ value: c, label: t(`monthEntry.carTypes.${c}`) }))}
          />
        </Field>
        <Field label={t("monthEntry.phone")}>
          <Switch checked={!!a.mobile_phone} disabled={readOnly} onChange={(v) => onChange(withAllowances(entry, { mobile_phone: v }))} />
        </Field>
      </div>
      <LineListEditor
        lines={linesOf(entry, "benefit", catalog)}
        onChange={(lines) => onChange(withLines(entry, "benefit", lines, catalog))}
        options={options}
        standing={(record.standing ?? []).filter((x) => codes.has(x.code)).map((x) => ({ code: x.code, label: nameOf(x.code), amount: x.amount }))}
        addLabel={t("monthEntry.addImputed")}
        readOnly={readOnly}
      />
    </div>
  );
}
