"use client";

import { Button } from "@/components/actions/button/Button";
import { Stat } from "@/components/data/stat/Stat";
import { Callout } from "@/components/feedback/callout/Callout";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { ProgressBar } from "@/components/feedback/progress-bar/ProgressBar";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { Spinner } from "@/components/feedback/spinner/Spinner";
import { StatusTag } from "@/components/feedback/status-tag/StatusTag";
import { SegmentedControl } from "@/components/inputs/segmented-control/SegmentedControl";
import { TabBar } from "@/components/navigation/tab-bar/TabBar";
import { Dialog } from "@/components/overlays/dialog/Dialog";
import { PageHeader } from "@/components/surfaces/page-header/PageHeader";
import { Money } from "@/components/typography/money/Money";
import { Text } from "@/components/typography/text/Text";
import { AddEmployeeDialog } from "@/screens/shared/add-employee/AddEmployeeDialog";
import { ApplyDialog } from "./ApplyDialog";
import { EntryToolbar } from "./EntryToolbar";
import { usePayrollMonth } from "./logic/usePayrollMonth";
import { payrollMonthStyles as s } from "./payrollMonth.styles";
import { SectionTable } from "./SectionTable";

/** The workbench: the month's progress, figures and alerts, then every employee by section. */
export function PayrollMonthScreen() {
  const vm = usePayrollMonth();
  const { t } = vm;
  const { expected, produced, sent } = vm.production;
  const allSent = expected > 0 && sent === expected;

  return (
    <>
      <PageHeader
        title={t("payroll.title", { company: vm.companyName })}
        titleAside={vm.monthLabel}
        meta={
          <div className={s.meta}>
            <StatusTag tone={vm.status.tone} icon={vm.status.icon} label={vm.statusLabel} />
            {vm.openMonths.length ? (
              <SegmentedControl
                size="sm"
                ariaLabel={t("payroll.openMonths")}
                value={vm.monthKey}
                onChange={vm.selectMonth}
                options={vm.openMonths}
              />
            ) : null}
            {vm.recalculating ? (
              <div className={s.recalc}>
                <Spinner size="sm" />
                <Text size="xs" tone="muted">{t("payroll.recalculating")}</Text>
              </div>
            ) : null}
          </div>
        }
        actions={
          vm.approved ? (
            vm.canReopen ? <Button icon="unlock" label={t("payroll.reopen")} loading={vm.reopening} onPress={vm.reopen} /> : null
          ) : (
            <div className={s.actions}>
              <div className={s.production}>
                <div className={s.productionRow}>
                  <Text size="xs" tone="muted">{t("payroll.production.label")}</Text>
                  <Text size="xs" weight="semibold" numeric>{t("payroll.production.count", { produced, expected })}</Text>
                </div>
                <ProgressBar
                  label={t("payroll.production.label")}
                  value={expected ? produced / expected : 0}
                  tone={allSent ? "success" : produced ? "warning" : "accent"}
                />
              </div>
              {vm.canEdit ? (
                <>
                  <Button
                    variant="secondary"
                    size="lg"
                    icon="lock"
                    label={t("payroll.close")}
                    disabled={!vm.canClose || vm.loading}
                    onPress={vm.askApprove}
                  />
                  <Button
                    variant={allSent ? "success" : "hero"}
                    size="xl"
                    icon={allSent ? "check-circle" : "send"}
                    label={allSent ? t("payroll.production.done") : t("payroll.production.action")}
                    loading={vm.producing}
                    disabled={!vm.canProduce || allSent || vm.loading}
                    onPress={vm.produce}
                  />
                </>
              ) : null}
            </div>
          )
        }
      />

      {vm.unreachable ? <Callout tone="danger" title={t("errors.apiTitle")} body={t("errors.apiBody")} /> : null}
      {vm.apiError ? <Callout tone="danger" title={t("errors.actionFailed")} body={vm.apiError} /> : null}

      <div className={s.stats}>
        <div className={s.stat}><Stat icon="users" label={t("payroll.stats.employees")} value={<Text size="lg" weight="semibold" numeric>{vm.totals.employees}</Text>} /></div>
        <div className={s.stat}><Stat icon="wallet" label={t("payroll.stats.gross")} value={<Money value={vm.totals.gross} size="lg" weight="semibold" />} /></div>
        <div className={s.stat}><Stat icon="landmark" label={t("payroll.stats.tax")} value={<Money value={vm.totals.tax} size="lg" weight="semibold" />} /></div>
        <div className={s.stat}><Stat icon="shield" label={t("payroll.stats.insurance")} value={<Money value={vm.totals.insurance} size="lg" weight="semibold" />} /></div>
        <div className={s.stat}><Stat icon="receipt" label={t("payroll.stats.net")} value={<Money value={vm.totals.net} size="lg" weight="semibold" tone="accent" />} /></div>
        <div className={s.stat}><Stat icon="building" label={t("payroll.stats.cost")} value={<Money value={vm.totals.cost} size="lg" weight="semibold" />} /></div>
      </div>

      {vm.errorCount || vm.warningCount ? (
        <Callout
          tone={vm.errorCount ? "danger" : "warning"}
          title={vm.alertText}
          actions={<Button size="sm" label={t("payroll.reviewExceptions")} onPress={() => vm.go(vm.exceptionsHref)} />}
        />
      ) : null}

      {vm.noEmployees ? (
        <EmptyState
          icon="users"
          title={t("payroll.grid.empty")}
          action={vm.canEdit ? <Button variant="primary" icon="plus" label={t("employees.add.action")} onPress={vm.addEmployee.show} /> : undefined}
        />
      ) : vm.loading ? (
        <Skeleton shape="tall" />
      ) : (
        <>
          <div className={s.sectionHead}>
            <TabBar
              ariaLabel={t("sections.label")}
              value={vm.section}
              onChange={vm.setSection}
              tabs={vm.sections.map((id) => ({ value: id, label: t(`sections.${id}`) }))}
            />
            <EntryToolbar vm={vm} />
          </div>
          <SectionTable vm={vm} />
        </>
      )}

      <AddEmployeeDialog form={vm.addEmployee} />
      <ApplyDialog vm={vm} />

      <Dialog
        open={vm.confirmOpen}
        onOpenChange={(o) => (o ? vm.askApprove() : vm.closeConfirm())}
        title={t("payroll.confirm.title", { month: vm.monthLabel })}
        description={t("payroll.confirm.body")}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button variant="ghost" label={t("common.cancel")} onPress={vm.closeConfirm} />
            <Button variant="primary" icon="lock" label={t("payroll.confirm.action")} loading={vm.approving} onPress={vm.approve} />
          </>
        }
      >
        <div className={s.dialogBody}>
          <div className={s.dialogRow}><Text tone="muted">{t("payroll.stats.employees")}</Text><Text weight="semibold" numeric>{vm.totals.employees}</Text></div>
          <div className={s.dialogRow}><Text tone="muted">{t("payroll.stats.net")}</Text><Money value={vm.totals.net} weight="semibold" /></div>
          <div className={s.dialogRow}><Text tone="muted">{t("payroll.confirm.form102")}</Text><Money value={vm.totals.form102Total} weight="semibold" /></div>
        </div>
      </Dialog>
    </>
  );
}
