"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { ChartColor } from "../chart.types";
import { donutChartStyles as s } from "./donutChart.styles";

interface DonutChartProps {
  data: { key: string; label: string; value: number; color: ChartColor }[];
  formatValue: (value: number) => string;
  centerLabel?: string;
  centerValue?: string;
  size?: number;
}

export function DonutChart({ data, formatValue, centerLabel, centerValue, size = 156 }: DonutChartProps) {
  return (
    <div className={s.root}>
      <div className={s.chart} style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={`var(--chart-${d.color})`} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {centerValue ? (
          <div className={s.center}>
            {centerLabel ? <span className={s.centerLabel}>{centerLabel}</span> : null}
            <span className={s.centerValue}>{centerValue}</span>
          </div>
        ) : null}
      </div>
      <div className={s.legend}>
        {data.map((d) => (
          <div key={d.key} className={s.legendRow}>
            <span className={s.legendKey}>
              <span className={s.swatch} style={{ background: `var(--chart-${d.color})` }} />
              <span className={s.legendLabel}>{d.label}</span>
            </span>
            <span className={s.legendValue}>{formatValue(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
