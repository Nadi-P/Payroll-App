"use client";

import { BarChart } from "@/components/charts/bar-chart/BarChart";
import { DataGrid } from "@/components/data/data-grid/DataGrid";
import { Badge } from "@/components/feedback/badge/Badge";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { Card } from "@/components/surfaces/card/Card";
import { Money } from "@/components/typography/money/Money";
import { Text } from "@/components/typography/text/Text";
import type { Payslip, TermChange } from "@/api/types.generated";
import { employeeProfileStyles as s } from "./employeeProfile.styles";
import type { EmployeeProfileVM } from "./logic/useEmployeeProfile";

const TONE = { added: "success", changed: "accent", removed: "danger" } as const;

/** Past payslips, and every change to the employment terms with its date. */
export function HistoryTab({ vm }: { vm: EmployeeProfileVM }) {
  const { t } = vm;
  const field = (c: TermChange) => {
    const [kind, code] = c.field.split(":");
    if (kind === "standing" && code) return t("history.fields.standing", { item: code });
    if (kind === "fund" && code) return t("history.fields.fund", { item: code });
    return t(`history.fields.${kind}`);
  };
  return (
    <div className={s.history}>
      <div className={s.tabBody}>
        {vm.history.length ? (
          <>
            <Card title={t("profile.history.chart")}>
              <BarChart
                data={vm.chart}
                xKey="month"
                stacked
                height={200}
                formatValue={vm.money}
                formatAxis={vm.moneyCompact}
                series={[
                  { key: "net", label: t("payslip.net"), color: 1 },
                  { key: "deductions", label: t("payslip.deductions"), color: 3 },
                ]}
              />
            </Card>
            <Card title={t("history.payslips")} padded={false}>
              <DataGrid<Payslip>
                readOnly
                framed={false}
                ariaLabel={t("profile.history.table")}
                rows={[...vm.history].reverse()}
                rowKey={(p) => `${p.period.year}-${p.period.month}`}
                onSelect={vm.showSlip}
                maxHeight="28rem"
                columns={[
                  { id: "month", header: t("profile.history.month"), cell: (p) => <Text weight="medium">{vm.periodLabel(p)}</Text> },
                  { id: "gross", header: t("payroll.grid.gross"), align: "end", cell: (p) => <Money value={p.bases.gross_cash} /> },
                  { id: "tax", header: t("payroll.grid.tax"), align: "end", cell: (p) => <Money value={p.income_tax.tax} /> },
                  { id: "net", header: t("payroll.grid.net"), align: "end", cell: (p) => <Money value={p.net_pay} weight="semibold" /> },
                  { id: "cost", header: t("payroll.grid.cost"), align: "end", cell: (p) => <Money value={p.employer_cost} /> },
                ]}
              />
            </Card>
          </>
        ) : (
          <Card>
            <EmptyState icon="receipt" title={t("profile.history.emptyTitle")} body={t("profile.history.emptyBody")} />
          </Card>
        )}
      </div>
      <Card title={t("history.changes")} padded={false}>
        {vm.changesLoading ? (
          <Skeleton shape="line" count={4} />
        ) : vm.changes.length ? (
          <div className={s.timeline}>
            {vm.changes.map((c) => (
              <div key={c.id} className={s.change}>
                <div className={s.changeHead}>
                  <Text weight="medium">{field(c)}</Text>
                  <Badge tone={TONE[c.change as keyof typeof TONE] ?? "neutral"} label={t(`history.change.${c.change}`)} />
                </div>
                {c.old || c.new ? (
                  <div className={s.changeValues}>
                    {c.old ? <Text size="sm" tone="subtle">{c.old}</Text> : null}
                    {c.old && c.new ? <Text size="sm" tone="subtle">→</Text> : null}
                    {c.new ? <Text size="sm" weight="medium">{c.new}</Text> : null}
                  </div>
                ) : null}
                <Text size="xs" tone="subtle">
                  {vm.changeDate(c.at)}
                  {c.user_name ? ` · ${c.user_name}` : ""}
                </Text>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="history" title={t("history.noChanges")} />
        )}
      </Card>
    </div>
  );
}
