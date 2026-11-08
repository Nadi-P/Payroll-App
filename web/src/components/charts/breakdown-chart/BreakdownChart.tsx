"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { breakdownChartStyles as s } from "./breakdownChart.styles";
import { useBreakdownChart, type BreakdownSlice } from "./useBreakdownChart";

interface BreakdownChartProps {
  slices: BreakdownSlice[];
  centerLabel: string;
  formatValue: (value: number) => string;
  formatPercent: (share: number) => string;
  /** Shown instead of the chart when nothing is selected. */
  emptyLabel: string;
}

/** A donut with the total in its middle and a ranked breakdown beside it. */
export function BreakdownChart({ slices, centerLabel, formatValue, formatPercent, emptyLabel }: BreakdownChartProps) {
  const chart = useBreakdownChart(slices);
  const renderTooltip = ({ active, payload }: TooltipContentProps<ValueType, NameType>) => {
    const item = active ? payload?.[0] : undefined;
    return item ? (
      <div className={s.tooltip}>
        <span className={s.swatch} style={{ background: String(item.payload?.fill ?? "") }} />
        <span className={s.tooltipLabel}>{item.name}</span>
        <span className={s.tooltipValue}>{formatValue(Number(item.value))}</span>
      </div>
    ) : null;
  };

  if (!chart.rows.length) return <div className={s.empty}>{emptyLabel}</div>;

  return (
    <div className={s.container}>
      <div className={s.root}>
        <div className={s.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chart.visible}
                dataKey="value"
                nameKey="label"
                innerRadius="70%"
                outerRadius="100%"
                paddingAngle={chart.visible.length > 1 ? 1.5 : 0}
                cornerRadius={3}
                stroke="none"
                startAngle={90}
                endAngle={-270}
                animationBegin={0}
                animationDuration={500}
                animationEasing="ease-out"
              >
                {chart.visible.map((d) => (
                  <Cell key={d.key} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip content={renderTooltip} />
            </PieChart>
          </ResponsiveContainer>
          <div className={s.center}>
            <span className={s.centerLabel}>{centerLabel}</span>
            <span className={s.centerValue}>{formatValue(chart.total)}</span>
          </div>
        </div>
        <div className={s.legend}>
          {chart.rows.map((d) => (
            <div key={d.key} className={s.row}>
              <span className={s.swatch} style={{ background: d.fill }} />
              <span className={s.label}>{d.label}</span>
              <span className={s.percent}>{formatPercent(d.share)}</span>
              <span className={s.value}>{formatValue(d.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
