"use client";

import { Button } from "@/components/actions/button/Button";
import { TextLink } from "@/components/actions/text-link/TextLink";
import { Avatar } from "@/components/data/avatar/Avatar";
import { Badge } from "@/components/feedback/badge/Badge";
import { Callout } from "@/components/feedback/callout/Callout";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { IssueItem } from "@/components/feedback/issue-item/IssueItem";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { Spinner } from "@/components/feedback/spinner/Spinner";
import { Card } from "@/components/surfaces/card/Card";
import { Text } from "@/components/typography/text/Text";
import { Link, useRouter } from "@/i18n/navigation";
import { ExplainPanel } from "@/screens/shared/explain-panel/ExplainPanel";
import { EntryEditor } from "@/screens/shared/month-entry/EntryEditor";
import { PayslipView } from "@/screens/shared/payslip-view/PayslipView";
import { employeeMonthStyles as s } from "./employeeMonth.styles";
import { useEmployeeMonth } from "./logic/useEmployeeMonth";
import { MonthDataTable } from "./MonthDataTable";
import { SectionBreakdownCard } from "./SectionBreakdownCard";

/** One employee in the payroll month: enter the month's data and see the payslip it makes. */
export function EmployeeMonthScreen() {
  const vm = useEmployeeMonth();
  const router = useRouter();
  const { t } = vm;

  if (vm.loading) return <Skeleton shape="tall" count={2} />;
  if (vm.missing || !vm.record)
    return (
      <EmptyState
        icon="user-x"
        title={t("employeeMonth.notThisMonth")}
        action={<Button label={t("employeeMonth.backToMonth")} icon="chevron-back" onPress={() => router.push(vm.hrefs.month)} />}
      />
    );

  return (
    <>
      <div className={s.back}>
        <TextLink href={vm.hrefs.month} icon="chevron-back" label={t("employeeMonth.backToMonth")} tone="muted" />
      </div>

      <div className={s.hero}>
        <Link href={vm.hrefs.profile} aria-label={t("employeeMonth.openProfile")} className={s.avatarLink}>
          <Avatar name={vm.name} size="xl" />
        </Link>
        <div className={s.heroText}>
          <Link href={vm.hrefs.profile} className={s.name}>
            {vm.name}
          </Link>
          <div className={s.heroMeta}>
            <Text tone="muted">{[vm.position, vm.department].filter(Boolean).join(" · ")}</Text>
            <Badge tone="outline" label={vm.monthLabel} />
            {vm.recalculating ? <Spinner size="sm" /> : null}
          </div>
        </div>
        <div className={s.heroActions}>
          {vm.canEdit ? (
            <Button variant="secondary" icon="sparkles" label={t("employeeMonth.simulate")} onPress={() => router.push(vm.hrefs.simulate)} />
          ) : null}
        </div>
      </div>

      {vm.error ? <Callout tone="danger" title={t("errors.actionFailed")} body={vm.error} /> : null}

      {vm.issues.length ? (
        <Card title={t("employeeMonth.alerts")} padded={false}>
          <div className={s.issues}>
            {vm.issues.map((issue, i) => (
              <IssueItem key={`${issue.code}-${i}`} severity={issue.severity} title={issue.title} detail={issue.hint} />
            ))}
          </div>
        </Card>
      ) : null}

      <div className={s.layout}>
        <div className={s.main}>
          <Card
            title={t("employeeMonth.entry")}
            actions={
              vm.dirty ? (
                <div className={s.saveBar}>
                  <Button variant="ghost" label={t("profile.discard")} onPress={vm.discard} />
                  <Button variant="primary" icon="check" label={t("common.save")} loading={vm.saving} onPress={vm.save} />
                </div>
              ) : null
            }
          >
            <EntryEditor
              section={vm.section}
              onSection={vm.setSection}
              entry={vm.entry}
              onChange={vm.setEntry}
              record={vm.record}
              catalog={vm.catalog}
              nameOf={vm.nameOf}
              slip={vm.slip}
              readOnly={!vm.canEdit}
              termsHref={vm.hrefs.terms}
            />
          </Card>
          <Card title={t("employeeMonth.data")}>
            <MonthDataTable vm={vm} />
          </Card>
        </div>
        <div className={s.side}>
          <Card title={t("employeeMonth.payslip")}>
            <PayslipView payslip={vm.slip} explain={vm.explain} showIssues={false} />
          </Card>
          <SectionBreakdownCard vm={vm} />
        </div>
      </div>
      <ExplainPanel explain={vm.explain} />
    </>
  );
}
