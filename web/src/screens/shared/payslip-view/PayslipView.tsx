"use client";

import { KeyValueList } from "@/components/data/key-value-list/KeyValueList";
import { SummaryRow } from "@/components/data/summary-row/SummaryRow";
import { Badge } from "@/components/feedback/badge/Badge";
import { IssueItem } from "@/components/feedback/issue-item/IssueItem";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { Heading } from "@/components/typography/heading/Heading";
import { Money } from "@/components/typography/money/Money";
import { NumberText } from "@/components/typography/number-text/NumberText";
import type { Payslip } from "@/api/types.generated";
import type { ExplainState } from "@/screens/shared/explain-panel/logic/useExplain";
import { flagKey } from "@/screens/shared/logic/flags";
import { usePayslipView, type PayslipRow } from "./logic/usePayslipView";
import { payslipViewStyles as s } from "./payslipView.styles";

interface PayslipViewProps {
  payslip: Payslip | undefined;
  explain: ExplainState;
  showIssues?: boolean;
}

export function PayslipView({ payslip, explain, showIssues = true }: PayslipViewProps) {
  const vm = usePayslipView(payslip, explain);
  if (!vm.ready) return <Skeleton shape="line" count={10} />;
  const { t } = vm;

  /** Negative amounts are credits (green) only in the tax breakdown; elsewhere they're plain. */
  const items = (rows: PayslipRow[], creditsArePositive = false) =>
    rows.map((r) => ({
      key: r.key,
      label: r.label,
      hint: r.hint,
      onExplain: r.explain,
      value:
        r.unit === "days" ? (
          <NumberText value={r.amount} unit={t("units.days")} />
        ) : (
          <Money value={r.amount} tone={creditsArePositive && Number(r.amount) < 0 ? "positive" : "default"} />
        ),
    }));

  return (
    <div className={s.root}>
      {showIssues && vm.issues.length ? (
        <div className={s.issues}>
          {vm.issues.map((f) => (
            <IssueItem
              key={f.code}
              severity={f.severity}
              title={t(`${flagKey(f.code)}.title`)}
              detail={t(`${flagKey(f.code)}.hint`)}
            />
          ))}
        </div>
      ) : null}

      <div className={s.section}>
        <div className={s.sectionHead}>
          <Heading level={3}>{t("payslip.earnings")}</Heading>
          <Money value={vm.gross} weight="semibold" />
        </div>
        <KeyValueList explainLabel={t("common.explain")} items={items(vm.earnings)} />
      </div>

      {vm.benefits.length ? (
        <div className={s.section}>
          <div className={s.sectionHead}>
            <Heading level={3}>{t("payslip.benefits")}</Heading>
          </div>
          <KeyValueList explainLabel={t("common.explain")} items={items(vm.benefits)} />
        </div>
      ) : null}

      <div className={s.section}>
        <div className={s.sectionHead}>
          <Heading level={3}>{t("payslip.deductions")}</Heading>
          <Money value={vm.deductionsTotal} weight="semibold" />
        </div>
        <KeyValueList explainLabel={t("common.explain")} items={items(vm.deductions)} />
      </div>

      <SummaryRow
        label={t("payslip.net")}
        title={t("common.explain")}
        onPress={vm.explainNet}
        value={<Money value={vm.net} size="xl" weight="semibold" tone="accent" />}
      />

      <div className={s.section}>
        <div className={s.sectionHead}>
          <Heading level={3}>{t("payslip.taxDetails")}</Heading>
        </div>
        <KeyValueList explainLabel={t("common.explain")} items={items(vm.tax, true)} />
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>
          <Heading level={3}>{t("payslip.employerSide")}</Heading>
        </div>
        <KeyValueList
          explainLabel={t("common.explain")}
          items={[
            ...items(vm.employer),
            {
              key: "cost",
              label: t("payslip.employerCost"),
              total: true,
              onExplain: vm.explainCost,
              value: <Money value={vm.cost} weight="semibold" />,
            },
          ]}
        />
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>
          <Heading level={3}>{t("payslip.balances")}</Heading>
        </div>
        <KeyValueList explainLabel={t("common.explain")} items={items(vm.balances)} />
      </div>

      <div className={s.meta}>
        <Badge tone="neutral" label={vm.insuranceCategory} />
        <Badge tone="outline" label={t("shell.lawVersion", { version: vm.version })} />
        {vm.unverified ? <Badge tone="warning" label={t("payslip.unverified", { count: vm.unverified })} /> : null}
      </div>
    </div>
  );
}
