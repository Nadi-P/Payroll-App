"use client";

import {
  Bar,
  CartesianGrid,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { barChartStyles as s, chartTheme } from "./barChart.styles";
import { useBarChart, type ChartSeries } from "./useBarChart";

interface BarChartProps {
  data: Record<string, string | number>[];
  xKey: string;
  series: ChartSeries[];
  stacked?: boolean;
  height?: number;
  formatValue: (value: number) => string;
  formatAxis?: (value: number) => string;
}

export function BarChart({ data, xKey, series, stacked, height = 240, formatValue, formatAxis }: BarChartProps) {
  const chart = useBarChart(series);
  const renderTooltip = ({ active, payload, label }: TooltipContentProps<ValueType, NameType>) =>
    active && payload?.length ? (
      <div className={s.tooltip}>
        <div className={s.tooltipTitle}>{label}</div>
        {payload.map((p) => (
          <div key={String(p.dataKey)} className={s.tooltipRow}>
            <span className={s.tooltipKey}>
              <span className={s.swatch} style={{ background: p.color }} />
              {chart.labelOf(String(p.dataKey))}
            </span>
            <span className={s.tooltipValue}>{formatValue(Number(p.value))}</span>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <div className={s.root}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={chartTheme.grid} />
          <XAxis
            dataKey={xKey}
            reversed={chart.rtl}
            tickLine={false}
            axisLine={false}
            tick={{ fill: chartTheme.axis, fontSize: chartTheme.fontSize }}
          />
          <YAxis
            orientation={chart.rtl ? "right" : "left"}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={formatAxis ?? formatValue}
            tick={{ fill: chartTheme.axis, fontSize: chartTheme.fontSize }}
          />
          <Tooltip cursor={{ fill: chartTheme.cursor }} content={renderTooltip} />
          {series.map((serie, i) => (
            <Bar
              key={serie.key}
              dataKey={serie.key}
              stackId={stacked ? "stack" : undefined}
              fill={chart.colorOf(serie)}
              radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={36}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
      <div className={s.legend}>
        {series.map((serie) => (
          <span key={serie.key} className={s.legendItem}>
            <span className={s.swatch} style={{ background: chart.colorOf(serie) }} />
            {serie.label}
          </span>
        ))}
      </div>
    </div>
  );
}
