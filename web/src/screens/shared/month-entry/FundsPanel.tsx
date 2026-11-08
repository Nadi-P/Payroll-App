"use client";

import { useTranslations } from "next-intl";
import { TextLink } from "@/components/actions/text-link/TextLink";
import { KeyValueList } from "@/components/data/key-value-list/KeyValueList";
import { Badge } from "@/components/feedback/badge/Badge";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { Money } from "@/components/typography/money/Money";
import { Text } from "@/components/typography/text/Text";
import { sectionParts } from "@/screens/shared/logic/payrollSections";
import type { EditorProps } from "./logic/editorProps";
import { monthEntryStyles as s } from "./monthEntry.styles";

const RATES = [
  "employee_rate",
  "employer_rate",
  "severance_rate",
  "disability_employee_rate",
  "disability_employer_rate",
  "other_employee_rate",
  "other_employer_rate",
] as const;

/** Social funds follow the employment terms: the funds and their rates, and this month's deposits. */
export function FundsPanel({ record, slip, nameOf, termsHref }: EditorProps & { termsHref?: string }) {
  const t = useTranslations();
  const funds = record.funds ?? [];
  const deposits = slip ? sectionParts(slip, "funds", (k) => t(k), nameOf).filter((p) => Math.abs(p.value) > 0.005) : [];
  return (
    <div className={s.root}>
      {funds.length ? (
        <div className={s.fundList}>
          {funds.map((f) => (
            <div key={f.code} className={s.fund}>
              <div className={s.fundName}>
                <Text weight="medium">{f.name}</Text>
                <Text size="xs" tone="subtle" numeric>
                  {t(`funds.kinds.${f.kind}`)} · {f.code}
                  {f.member_number ? ` · ${f.member_number}` : ""}
                </Text>
              </div>
              <div className={s.fundRates}>
                {f.salary_share && Number(f.salary_share) !== 100 ? <Badge tone="accent" label={t("funds.share", { share: Number(f.salary_share) })} /> : null}
                {RATES.map((r) => {
                  const v = f[r];
                  if (v === null || v === undefined) return null;
                  return Number(v) ? <Badge key={r} label={t(`funds.rates.${r}`, { rate: Number(v) })} /> : null;
                })}
                {f.kind !== "study_fund" && f.employee_rate == null && f.employer_rate == null ? <Badge tone="outline" label={t("funds.statutory")} /> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="piggy-bank" title={t("funds.none")} />
      )}
      {deposits.length ? (
        <KeyValueList items={deposits.map((p) => ({ key: p.key, label: p.label, value: <Money value={p.value} /> }))} />
      ) : null}
      {termsHref ? (
        <div>
          <TextLink href={termsHref} icon="pencil" label={t("funds.editTerms")} />
        </div>
      ) : null}
    </div>
  );
}
