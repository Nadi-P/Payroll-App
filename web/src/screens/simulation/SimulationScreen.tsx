"use client";

import { Button } from "@/components/actions/button/Button";
import { Badge } from "@/components/feedback/badge/Badge";
import { Callout } from "@/components/feedback/callout/Callout";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { TabBar } from "@/components/navigation/tab-bar/TabBar";
import { Card } from "@/components/surfaces/card/Card";
import { PageHeader } from "@/components/surfaces/page-header/PageHeader";
import { EntryEditor } from "@/screens/shared/month-entry/EntryEditor";
import { FundsEditor } from "@/screens/shared/terms/FundsEditor";
import { PayTermsEditor } from "@/screens/shared/terms/PayTermsEditor";
import { StandingEditor } from "@/screens/shared/terms/StandingEditor";
import { ComparisonCard } from "./ComparisonCard";
import { useSimulation } from "./logic/useSimulation";
import { simulationStyles as s } from "./simulation.styles";

/** A sandbox for one employee's month: change terms or this month's data and watch the result. */
export function SimulationScreen() {
  const vm = useSimulation();
  const { t } = vm;
  if (vm.loading || !vm.record || !vm.entry) return <Skeleton shape="tall" count={2} />;
  const readOnly = !vm.canEdit;

  return (
    <>
      <PageHeader
        title={t("simulation.title", { name: vm.name })}
        titleAside={vm.monthLabel}
        meta={<div className={s.meta}>{vm.changed ? <Badge tone="warning" label={t("simulation.unsaved")} /> : null}</div>}
        actions={
          <div className={s.actions}>
            {vm.changed ? <Button variant="ghost" icon="refresh" label={t("simulation.reset")} onPress={vm.reset} /> : null}
            <Button variant="secondary" label={t("simulation.discard")} onPress={vm.discard} />
            <Button variant="primary" icon="check" label={t("simulation.save")} disabled={!vm.changed || readOnly} loading={vm.saving} onPress={vm.save} />
          </div>
        }
      />
      {vm.error ? <Callout tone="danger" title={t("errors.actionFailed")} body={vm.error} /> : null}

      <div className={s.layout}>
        <div className={s.main}>
          <TabBar
            ariaLabel={t("simulation.tabs.label")}
            value={vm.tab}
            onChange={vm.setTab}
            tabs={[
              { value: "terms", label: t("simulation.tabs.terms") },
              { value: "month", label: t("simulation.tabs.month") },
            ]}
          />
          {vm.tab === "terms" ? (
            <div className={s.stack}>
              <Card title={t("terms.pay")}>
                <PayTermsEditor record={vm.record} onChange={vm.setRecord} readOnly={readOnly} withPlacement={false} />
              </Card>
              <Card title={t("terms.funds")}>
                <FundsEditor record={vm.record} onChange={vm.setRecord} readOnly={readOnly} />
              </Card>
              <Card title={t("terms.standing")}>
                <StandingEditor record={vm.record} onChange={vm.setRecord} readOnly={readOnly} options={vm.standingOptions} />
              </Card>
            </div>
          ) : (
            <Card>
              <EntryEditor
                section={vm.section}
                onSection={vm.setSection}
                entry={vm.entry}
                onChange={vm.setEntry}
                record={vm.record}
                catalog={vm.catalog}
                nameOf={vm.nameOf}
                slip={vm.after}
                readOnly={readOnly}
              />
            </Card>
          )}
        </div>
        <div className={s.side}>
          <ComparisonCard
            title={t("simulation.employee")}
            rows={vm.figures}
            busy={vm.calculating}
            labels={{ now: t("simulation.now"), after: t("simulation.after"), change: t("simulation.change") }}
          />
          <ComparisonCard
            title={t("simulation.month")}
            rows={vm.impact}
            labels={{ now: t("simulation.now"), after: t("simulation.after"), change: t("simulation.change") }}
          />
        </div>
      </div>
    </>
  );
}
