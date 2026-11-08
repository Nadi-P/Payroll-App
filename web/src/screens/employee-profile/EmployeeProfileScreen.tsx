"use client";

import { Button } from "@/components/actions/button/Button";
import { Avatar } from "@/components/data/avatar/Avatar";
import { Badge } from "@/components/feedback/badge/Badge";
import { Callout } from "@/components/feedback/callout/Callout";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs/Breadcrumbs";
import { TabBar } from "@/components/navigation/tab-bar/TabBar";
import { SidePanel } from "@/components/overlays/side-panel/SidePanel";
import { Heading } from "@/components/typography/heading/Heading";
import { Money } from "@/components/typography/money/Money";
import { Text } from "@/components/typography/text/Text";
import { ExplainPanel } from "@/screens/shared/explain-panel/ExplainPanel";
import { PayslipView } from "@/screens/shared/payslip-view/PayslipView";
import { DetailsTab } from "./DetailsTab";
import { employeeProfileStyles as s } from "./employeeProfile.styles";
import { HistoryTab } from "./HistoryTab";
import { useEmployeeProfile } from "./logic/useEmployeeProfile";
import { TermsTab } from "./TermsTab";

/** Who the employee is and on what terms they work; their month is one click away. */
export function EmployeeProfileScreen() {
  const vm = useEmployeeProfile();
  const { t } = vm;

  if (vm.notFound) return <EmptyState icon="user" title={t("profile.notFound")} />;
  if (vm.loading || !vm.draft || !vm.facts) return <Skeleton shape="tall" count={2} />;
  const e = vm.draft.employee;
  const f = vm.facts;

  return (
    <>
      <Breadcrumbs ariaLabel={t("shell.breadcrumbs")} items={[{ label: t("nav.employees"), href: vm.backHref }, { label: vm.name }]} />

      <div className={s.hero}>
        <div className={s.heroMain}>
          <Avatar name={vm.name} size="xl" />
          <div className={s.heroText}>
            <Heading level={1}>{vm.name}</Heading>
            <Text tone="muted">
              {[vm.draft.profile.position, vm.draft.profile.department, vm.draft.profile.sub_department].filter(Boolean).join(" · ")}
            </Text>
            <div className={s.badges}>
              <Badge tone="outline" label={t(`employee.kinds.${e.kind}`)} />
              {e.end_date ? <Badge tone="neutral" label={t("profile.ended")} /> : <Badge tone="success" label={t("profile.active")} />}
              {(vm.draft.funds ?? []).length || e.pension ? null : <Badge tone="warning" label={t("employees.pensionNo")} />}
            </div>
          </div>
          <div className={s.heroAction}>
            <Button
              variant="hero"
              size="xl"
              icon="wallet"
              iconEnd="chevron-forward"
              label={t("profile.openMonth", { month: vm.monthLabel })}
              disabled={!vm.employedNow}
              onPress={vm.openMonth}
            />
          </div>
        </div>
        <div className={s.facts}>
          <div className={s.fact}><Text size="xs" tone="subtle">{t("profile.facts.number")}</Text><Text weight="medium" numeric>{f.number}</Text></div>
          <div className={s.fact}><Text size="xs" tone="subtle">{t("profile.fields.nationalId")}</Text><Text weight="medium" numeric>{f.nationalId}</Text></div>
          <div className={s.fact}><Text size="xs" tone="subtle">{t("profile.fields.startDate")}</Text><Text weight="medium" numeric>{f.start}</Text></div>
          <div className={s.fact}>
            <Text size="xs" tone="subtle">{t("profile.facts.seniority")}</Text>
            <Text weight="medium" numeric>{t("profile.facts.seniorityValue", f.seniority)}</Text>
          </div>
          <div className={s.fact}><Text size="xs" tone="subtle">{t("profile.fields.jobFraction")}</Text><Text weight="medium" numeric>{`${f.fraction}%`}</Text></div>
          <div className={s.fact}>
            <Text size="xs" tone="subtle">{f.kind === "monthly" ? t("profile.fields.salary") : t("profile.fields.rate")}</Text>
            <Money value={f.pay} weight="medium" />
          </div>
        </div>
      </div>

      <TabBar
        ariaLabel={t("profile.tabsLabel")}
        value={vm.tab}
        onChange={vm.setTab}
        tabs={[
          { value: "details", label: t("profile.tabs.details") },
          { value: "terms", label: t("profile.tabs.terms") },
          { value: "history", label: t("profile.tabs.history"), count: vm.history.length },
        ]}
      />

      {vm.saveError ? <Callout tone="danger" title={t("profile.saveFailed")} body={vm.saveError} /> : null}

      {vm.tab === "details" ? <DetailsTab vm={vm} /> : null}
      {vm.tab === "terms" ? <TermsTab vm={vm} /> : null}
      {vm.tab === "history" ? <HistoryTab vm={vm} /> : null}

      {vm.dirty ? (
        <div className={s.saveBar}>
          <Text weight="medium">{t("profile.unsaved")}</Text>
          <div className={s.saveActions}>
            <Button variant="ghost" label={t("profile.discard")} onPress={vm.discard} />
            <Button variant="primary" icon="check" label={t("common.save")} loading={vm.saving} disabled={!vm.canEdit} onPress={vm.save} />
          </div>
        </div>
      ) : null}

      <SidePanel
        size="lg"
        open={!!vm.openSlip}
        onOpenChange={(o) => !o && vm.closeSlip()}
        title={vm.openSlip ? t("profile.history.payslipFor", { month: vm.periodLabel(vm.openSlip) }) : ""}
        subtitle={vm.name}
        closeLabel={t("common.close")}
      >
        <PayslipView payslip={vm.openSlip ?? undefined} explain={vm.explain} />
      </SidePanel>
      <ExplainPanel explain={vm.explain} />
    </>
  );
}
