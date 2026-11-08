"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/actions/button/Button";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { Field } from "@/components/inputs/field/Field";
import { NumberInput } from "@/components/inputs/number-input/NumberInput";
import { Select } from "@/components/inputs/select/Select";
import { TextInput } from "@/components/inputs/text-input/TextInput";
import { Text } from "@/components/typography/text/Text";
import type { FundEnrollment } from "@/api/types.generated";
import { FUND_KINDS, FUND_RATES, newFund, withFunds, type TermsProps } from "./logic/termsDraft";
import { termsStyles as s } from "./terms.styles";

/** The provident funds the employee deposits to, with their identifiers and rates. */
export function FundsEditor({ record, onChange, readOnly }: TermsProps) {
  const t = useTranslations();
  const funds = record.funds ?? [];
  const set = (i: number, patch: Partial<FundEnrollment>) =>
    onChange(withFunds(record, funds.map((f, j) => (j === i ? { ...f, ...patch } : f))));
  return (
    <div className={s.root}>
      {funds.length === 0 ? <EmptyState icon="piggy-bank" title={t("funds.none")} /> : null}
      {funds.map((f, i) => {
        const pensionType = f.kind !== "study_fund";
        return (
          <div key={i} className={s.fund}>
            <div className={s.fundHead}>
              <div className={s.fundTitle}>
                <Text weight="semibold">{f.name || t("funds.unnamed")}</Text>
                <Text size="xs" tone="subtle">{t(`funds.kinds.${f.kind}`)}</Text>
              </div>
              {readOnly ? null : (
                <IconButton icon="trash" label={t("funds.remove")} onPress={() => onChange(withFunds(record, funds.filter((_, j) => j !== i)))} />
              )}
            </div>
            <div className={s.fundIds}>
              <Field label={t("funds.fields.name")}>
                <TextInput value={f.name} disabled={readOnly} onChange={(v) => set(i, { name: v })} />
              </Field>
              <Field label={t("funds.fields.kind")}>
                <Select
                  ariaLabel={t("funds.fields.kind")}
                  value={f.kind}
                  disabled={readOnly}
                  onChange={(v) => set(i, { kind: v as FundEnrollment["kind"] })}
                  options={FUND_KINDS.map((k) => ({ value: k, label: t(`funds.kinds.${k}`) }))}
                />
              </Field>
              <Field label={t("funds.fields.code")}>
                <TextInput ltr value={f.code} disabled={readOnly} onChange={(v) => set(i, { code: v })} />
              </Field>
              <Field label={t("funds.fields.member")}>
                <TextInput ltr value={f.member_number ?? ""} disabled={readOnly} onChange={(v) => set(i, { member_number: v })} />
              </Field>
              <Field label={t("funds.fields.branch")}>
                <TextInput ltr value={f.branch ?? ""} disabled={readOnly} onChange={(v) => set(i, { branch: v })} />
              </Field>
              <Field label={t("funds.fields.group")}>
                <TextInput ltr value={f.group ?? ""} disabled={readOnly} onChange={(v) => set(i, { group: v })} />
              </Field>
              <Field label={t("funds.fields.amountsRef")}>
                <TextInput ltr value={f.amounts_ref ?? ""} disabled={readOnly} onChange={(v) => set(i, { amounts_ref: v })} />
              </Field>
              <Field label={t("funds.fields.share")}>
                <NumberInput suffix="%" value={f.salary_share ?? "100"} disabled={readOnly} onCommit={(v) => set(i, { salary_share: v ?? "100" })} />
              </Field>
            </div>
            <div className={s.ratesTitle}>
              <Text size="sm" weight="medium" tone="muted">{t("funds.ratesTitle")}</Text>
            </div>
            <div className={s.fundRates}>
              {FUND_RATES.filter((r) => pensionType || r === "employee_rate" || r === "employer_rate").map((r) => (
                <Field key={r} label={t(`funds.rateNames.${r}`)}>
                  <NumberInput
                    suffix="%"
                    value={f[r] ?? null}
                    placeholder={pensionType && (r === "employee_rate" || r === "employer_rate" || r === "severance_rate") ? t("funds.statutory") : "0"}
                    disabled={readOnly}
                    onCommit={(v) => set(i, { [r]: r.startsWith("disability") || r.startsWith("other") ? (v ?? "0") : v })}
                  />
                </Field>
              ))}
            </div>
          </div>
        );
      })}
      {readOnly ? null : (
        <div>
          <Button variant="secondary" size="sm" icon="plus" label={t("funds.add")} onPress={() => onChange(withFunds(record, [...funds, newFund(funds.length + 1)]))} />
        </div>
      )}
    </div>
  );
}
