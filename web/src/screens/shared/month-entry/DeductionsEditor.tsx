"use client";

import { useTranslations } from "next-intl";
import { LineListEditor } from "./LineListEditor";
import type { EditorProps } from "./logic/editorProps";
import { enterable, linesOf, withLines } from "./logic/entryDraft";
import { monthEntryStyles as s } from "./monthEntry.styles";

/** Voluntary deductions: anything taken from net pay that the law does not require. */
export function DeductionsEditor({ entry, onChange, record, catalog, nameOf, readOnly }: EditorProps) {
  const t = useTranslations();
  const options = enterable(catalog, "deduction").map((c) => ({ value: c.code, label: nameOf(c.code) }));
  const codes = new Set(options.map((o) => o.value));
  return (
    <div className={s.root}>
      <LineListEditor
        amountsOnly
        lines={linesOf(entry, "deduction", catalog)}
        onChange={(lines) => onChange(withLines(entry, "deduction", lines, catalog))}
        options={options}
        standing={(record.standing ?? []).filter((x) => codes.has(x.code)).map((x) => ({ code: x.code, label: nameOf(x.code), amount: x.amount }))}
        addLabel={t("monthEntry.addDeduction")}
        readOnly={readOnly}
      />
    </div>
  );
}
