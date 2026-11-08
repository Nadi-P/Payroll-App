"use client";

import { Button } from "@/components/actions/button/Button";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { ReportSidePanel } from "@/components/data/report-view/panel/ReportSidePanel";
import { ReportPivot } from "@/components/data/report-view/ReportPivot";
import { ReportTable } from "@/components/data/report-view/ReportTable";
import { Badge } from "@/components/feedback/badge/Badge";
import { Callout } from "@/components/feedback/callout/Callout";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { SegmentedControl } from "@/components/inputs/segmented-control/SegmentedControl";
import { Heading } from "@/components/typography/heading/Heading";
import { AnalysisView } from "./AnalysisView";
import { dataHistoryStyles as s } from "./dataHistory.styles";
import type { DataHistoryVM } from "./logic/useDataHistory";

/** One base report: table, pivot or analysis, with the column tools in a side panel. */
export function ReportWorkspace({ vm }: { vm: DataHistoryVM }) {
  const { t } = vm;
  const config = vm.config;
  const analysis = vm.mode === "analysis";
  return (
    <div className={s.workspace}>
      <div className={s.bar}>
        <IconButton icon="chevron-back" label={t("dataHistory.back")} onPress={vm.back} />
        <div className={s.barTitle}>
          <Heading level={2}>{vm.title}</Heading>
          {vm.coverage ? <Badge tone="outline" label={vm.coverage} /> : null}
          {vm.filtersOn ? <Badge tone="accent" label={t("dataHistory.filtersOn", { count: vm.filtersOn })} /> : null}
        </div>
        <div className={s.barActions}>
          {vm.filtersOn ? <Button variant="ghost" size="sm" icon="x" label={t("dataHistory.clearFilters")} onPress={vm.clearFilters} /> : null}
          <SegmentedControl
            ariaLabel={t("dataHistory.modes.label")}
            value={vm.mode}
            onChange={vm.setMode}
            options={[
              { value: "table", label: t("dataHistory.modes.table"), icon: "table" },
              { value: "pivot", label: t("dataHistory.modes.pivot"), icon: "pivot" },
              { value: "analysis", label: t("dataHistory.modes.analysis"), icon: "bar-chart" },
            ]}
          />
          {analysis ? null : (
            <>
              <Button variant="secondary" icon="download" label={t("dataHistory.export")} disabled={vm.loading} onPress={vm.exportFile} />
              <IconButton icon="sliders" label={t("reportView.panel.title")} onPress={vm.togglePanel} />
            </>
          )}
        </div>
      </div>

      {vm.failed ? <Callout tone="danger" title={t("errors.apiTitle")} body={t("errors.apiBody")} /> : null}

      {vm.loading || !config ? (
        <Skeleton shape="tall" />
      ) : (
        <div className={s.body({ analysis })}>
          {analysis ? (
            <AnalysisView vm={vm} />
          ) : (
            <>
              <div className={s.main}>
                {vm.mode === "table" ? (
                  <ReportTable
                    ariaLabel={vm.title}
                    fields={vm.fields}
                    rows={vm.rows}
                    config={config}
                    onConfigChange={vm.setConfig}
                    labels={vm.labels.report}
                    format={vm.format}
                    onOpenField={vm.openField}
                  />
                ) : (
                  <ReportPivot
                    ariaLabel={vm.title}
                    fields={vm.fields}
                    rows={vm.rows}
                    config={config}
                    onConfigChange={vm.setConfig}
                    labels={vm.labels.report}
                    format={vm.format}
                  />
                )}
              </div>
              <ReportSidePanel
                open={vm.panelOpen}
                onClose={vm.closePanel}
                mode={vm.mode === "pivot" ? "pivot" : "table"}
                fields={vm.fields}
                rows={vm.rows}
                config={config}
                onConfigChange={vm.setConfig}
                presets={vm.presets}
                labels={vm.labels.panel}
                format={vm.format}
                focusField={vm.focusField}
                onFocusField={vm.openField}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
