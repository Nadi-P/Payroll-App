"use client";

import { Button } from "@/components/actions/button/Button";
import { TextLink } from "@/components/actions/text-link/TextLink";
import { DataGrid } from "@/components/data/data-grid/DataGrid";
import { Stat } from "@/components/data/stat/Stat";
import { Badge } from "@/components/feedback/badge/Badge";
import { Callout } from "@/components/feedback/callout/Callout";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { Card } from "@/components/surfaces/card/Card";
import { PageHeader } from "@/components/surfaces/page-header/PageHeader";
import { Money } from "@/components/typography/money/Money";
import { Text } from "@/components/typography/text/Text";
import type { EmployeeDiff, MonthInfo } from "@/api/types.generated";
import { correctionsStyles as s } from "./corrections.styles";
import { useCorrectionsScreen } from "./logic/useCorrections";

export function CorrectionsScreen() {
  const vm = useCorrectionsScreen();
  const { t } = vm;

  return (
    <>
      <PageHeader
        eyebrow={<Badge tone="accent" label={vm.monthLabel} />}
        title={t("corrections.title")}
        subtitle={t("corrections.subtitle")}
      />
      {vm.error ? <Callout tone="danger" title={t("errors.actionFailed")} body={vm.error} /> : null}

      <div className={s.layout}>
        <div className={s.main}>
          {vm.status === "approved" ? (
            <Callout
              tone="info"
              title={t("corrections.approvedTitle")}
              body={t("corrections.approvedBody")}
              actions={<Button icon="unlock" label={t("payroll.reopen")} loading={vm.reopening} onPress={vm.reopen} />}
            />
          ) : vm.reopened ? (
            <>
              <Callout
                tone="warning"
                title={t("corrections.openTitle")}
                body={t("corrections.openBody")}
                actions={<TextLink href={vm.payrollHref} label={t("corrections.editInPayroll")} />}
              />
              <div className={s.totals}>
                <div className={s.total}><Stat label={t("corrections.netChange")} value={<Money value={vm.totals.net} signed colorBySign size="lg" weight="semibold" />} /></div>
                <div className={s.total}><Stat label={t("corrections.taxChange")} value={<Money value={vm.totals.tax} signed size="lg" weight="semibold" />} /></div>
                <div className={s.total}><Stat label={t("corrections.costChange")} value={<Money value={vm.totals.cost} signed size="lg" weight="semibold" />} /></div>
              </div>
              <DataGrid<EmployeeDiff>
                readOnly
                ariaLabel={t("corrections.title")}
                rows={vm.items}
                rowKey={(d) => d.employee_id}
                empty={<EmptyState icon="check" title={t("corrections.noChanges")} body={t("corrections.noChangesBody")} />}
                columns={[
                  { id: "name", header: t("employees.columns.name"), sticky: true, cell: (d) => <Text weight="medium">{vm.nameOf(d)}</Text> },
                  {
                    id: "lines",
                    header: t("corrections.changedLines"),
                    cell: (d) => (
                      <div className={s.changes}>
                        {d.diff.lines.map(([code]) => <Badge key={code} tone="neutral" label={vm.lineName(code)} />)}
                      </div>
                    ),
                  },
                  { id: "gross", header: t("payroll.grid.gross"), align: "end", cell: (d) => <Money value={d.diff.gross_cash} signed /> },
                  { id: "tax", header: t("payroll.grid.tax"), align: "end", cell: (d) => <Money value={d.diff.income_tax} signed /> },
                  { id: "net", header: t("payroll.grid.net"), align: "end", cell: (d) => <Money value={d.diff.net_pay} signed colorBySign weight="semibold" /> },
                  { id: "cost", header: t("payroll.grid.cost"), align: "end", cell: (d) => <Money value={d.diff.employer_cost} signed /> },
                ]}
              />
            </>
          ) : (
            <Card>
              <EmptyState icon="history" title={t("corrections.noneTitle")} body={t("corrections.noneBody")} />
            </Card>
          )}
        </div>

        <Card title={t("corrections.months")} padded={false}>
          <DataGrid<MonthInfo>
            readOnly
            framed={false}
            ariaLabel={t("corrections.months")}
            rows={vm.months}
            rowKey={(m) => `${m.period.year}-${m.period.month}`}
            onSelect={vm.openMonth}
            columns={[
              { id: "month", header: t("profile.history.month"), cell: (m) => <Text weight={vm.isCurrent(m) ? "semibold" : "regular"}>{vm.periodLabel(m)}</Text> },
              {
                id: "status",
                header: t("rulesCenter.columns.status"),
                align: "end",
                cell: (m) => <Badge dot tone={m.status === "approved" ? "success" : "neutral"} label={t(`status.${m.status}`)} />,
              },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
