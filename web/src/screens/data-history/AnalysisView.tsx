"use client";

import { BarChart } from "@/components/charts/bar-chart/BarChart";
import { BreakdownChart } from "@/components/charts/breakdown-chart/BreakdownChart";
import type { ChartColor } from "@/components/charts/chart.types";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart/HorizontalBarChart";
import { Stat } from "@/components/data/stat/Stat";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { Card } from "@/components/surfaces/card/Card";
import { Text } from "@/components/typography/text/Text";
import { dataHistoryStyles as s } from "./dataHistory.styles";
import type { AnalysisBlock } from "./logic/analysis";
import type { DataHistoryVM } from "./logic/useDataHistory";

const hasData = (b: AnalysisBlock) => (b.kind === "share" ? b.slices.length > 0 : b.data.length > 0);

/** Key figures and charts of the report, over the rows its filters keep. */
export function AnalysisView({ vm }: { vm: DataHistoryVM }) {
  const model = vm.analysis;
  if (!model || vm.rowCount === 0) return <EmptyState icon="bar-chart" title={vm.t("reportView.empty")} />;
  const fmt = (f: Parameters<DataHistoryVM["fmt"]>[0]) => (v: number) => vm.fmt(f, v);

  const body = (b: AnalysisBlock) => {
    if (b.kind === "trend")
      return <BarChart data={b.data} xKey="month" series={b.series} stacked={b.stacked} height={280} formatValue={fmt(b.format)} formatAxis={fmt(b.format)} />;
    if (b.kind === "share")
      return (
        <BreakdownChart
          slices={b.slices.map((x, i) => ({ ...x, color: ((i % 10) + 1) as ChartColor }))}
          centerLabel={vm.t("breakdown.total")}
          formatValue={fmt(b.format)}
          formatPercent={(share) => vm.fmt("percent", share * 100)}
          emptyLabel={vm.t("breakdown.empty")}
        />
      );
    return <HorizontalBarChart data={b.data} series={[{ key: "value", label: b.seriesLabel, color: b.color ?? 1 }]} formatValue={fmt(b.format)} formatAxis={fmt(b.format)} />;
  };

  return (
    <div className={s.analysis}>
      <div className={s.stats}>
        {model.stats.map((stat) => (
          <div key={stat.id} className={s.stat}>
            <Stat label={stat.label} value={<Text size="xl" weight="semibold" numeric>{vm.fmt(stat.format, stat.value)}</Text>} />
          </div>
        ))}
      </div>
      <div className={s.blocks}>
        {model.blocks.filter(hasData).map((b) => (
          <div key={b.id} className={b.kind === "trend" ? s.wide : undefined}>
            <Card title={b.title}>{body(b)}</Card>
          </div>
        ))}
      </div>
    </div>
  );
}
