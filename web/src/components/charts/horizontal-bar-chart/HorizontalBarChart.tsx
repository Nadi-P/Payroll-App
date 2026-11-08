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
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import {
  chartTheme,
  horizontalBarChartStyles as s,
} from "./horizontalBarChart.styles";
import {
  useHorizontalBarChart,
  type HorizontalSeries,
} from "./useHorizontalBarChart";

interface HorizontalBarChartProps {
  /** One row per category; `label` is the row name, the rest are series values. */
  data: ({ label: string } & Record<string, string | number>)[];
  series: HorizontalSeries[];
  formatValue: (value: number) => string;
  formatAxis?: (value: number) => string;
  /** Pixels per row; the chart grows downward as rows are added. */
  rowHeight?: number;
  labelWidth?: number;
}

/** Stacked horizontal bars. Series sharing a `stack` form one bar; different stacks sit side by side. */
export function HorizontalBarChart({
  data,
  series,
  formatValue,
  formatAxis,
  rowHeight = 44,
  labelWidth = 150,
}: HorizontalBarChartProps) {
  const chart = useHorizontalBarChart(series, data.length, rowHeight);
  const renderTooltip = ({
    active,
    payload,
    label,
  }: TooltipContentProps<ValueType, NameType>) =>
    active && payload?.length ? (
      <div className={s.tooltip}>
        <div className={s.tooltipTitle}>{label}</div>
        {chart.tooltipRows(payload).map((group) => (
          <div key={group.stack} className={s.tooltipGroup}>
            {group.title ? (
              <div className={s.tooltipGroupTitle}>
                <span>{group.title}</span>
                <span className={s.tooltipValue}>
                  {formatValue(group.total)}
                </span>
              </div>
            ) : null}
            {group.rows.map((row) => (
              <div key={row.key} className={s.tooltipRow}>
                <span className={s.tooltipKey}>
                  <span
                    className={s.swatch}
                    style={{ background: row.color }}
                  />
                  {row.label}
                </span>
                <span className={s.tooltipValue}>{formatValue(row.value)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    ) : null;

  return (
    <div className={s.root}>
      <div className={s.frame} style={{ height: chart.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
            barCategoryGap={chart.gap}
            barGap={3}
          >
            <CartesianGrid horizontal={false} stroke={chartTheme.grid} />
            <XAxis
              type="number"
              reversed={chart.rtl}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxis ?? formatValue}
              tick={{ fill: chartTheme.axis, fontSize: chartTheme.fontSize }}
            />
            <YAxis
              type="category"
              dataKey="label"
              orientation={chart.rtl ? "right" : "left"}
              width={labelWidth}
              tickLine={false}
              axisLine={false}
              // "end" keeps labels beside the axis in both directions: SVG anchors follow the page direction.
              tick={{
                fill: chartTheme.label,
                fontSize: chartTheme.labelSize,
                textAnchor: "end",
              }}
            />
            <Tooltip
              cursor={{ fill: chartTheme.cursor }}
              content={renderTooltip}
            />
            {series.map((serie) => (
              <Bar
                key={serie.key}
                dataKey={serie.key}
                name={serie.label}
                stackId={serie.stack ?? "main"}
                fill={chart.colorOf(serie)}
                radius={chart.radiusOf(serie)}
                maxBarSize={chart.barSize}
                animationBegin={0}
              animationDuration={450}
                animationEasing="ease-out"
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
      <div className={s.legend}>
        {chart.legend.map((item) => (
          <span key={item.key} className={s.legendItem}>
            <span className={s.swatch} style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
