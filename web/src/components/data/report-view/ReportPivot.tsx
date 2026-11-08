"use client";

import { Icon } from "@/components/typography/icon/Icon";
import { reportPivotStyles as s } from "./reportView.styles";
import type { ReportConfig, ReportField, ReportLabels, ReportRow, ValueItem } from "./reportView.types";
import { useReportPivot } from "./useReportPivot";

interface ReportPivotProps {
  fields: ReportField[];
  rows: ReportRow[];
  config: ReportConfig;
  onConfigChange: (config: ReportConfig) => void;
  labels: ReportLabels;
  format: (field: ReportField, value: unknown) => string;
  ariaLabel: string;
}

/** The report as a pivot table built in the side panel; groups open and close in place. */
export function ReportPivot({ fields, rows, config, onConfigChange, labels, format, ariaLabel }: ReportPivotProps) {
  const vm = useReportPivot({ fields, rows, config, onConfigChange });
  const values = config.values;

  if (vm.empty) return <div className={s.root}><div className={s.empty}>{values.length ? labels.empty : labels.emptyPivot}</div></div>;

  const valueField = (item: ValueItem): ReportField => {
    if (item.deviationId) {
      const d = config.deviations.find((x) => x.id === item.deviationId);
      const name = d?.name || (item.kind === "percent" ? labels.percent : labels.diff);
      return { id: item.field, label: item.kind === "percent" ? `${name} %` : name, type: item.kind === "percent" ? "number" : "money" };
    }
    const f = vm.byId.get(item.field);
    return { id: item.field, label: f?.label ?? item.field, type: item.aggregation === "count" ? "number" : (f?.type ?? "number") };
  };
  const valueHeader = (item: ValueItem) => {
    const f = valueField(item);
    return item.deviationId ? f.label : `${labels.aggregations[item.aggregation]} · ${f.label}`;
  };
  const show = (item: ValueItem, v: number | null) => (v === null ? "" : format(valueField(item), v));
  const multiCols = config.columns.length > 0;
  const rowTitle = config.rows.map((id) => vm.byId.get(id)?.label ?? id).join(" › ");

  return (
    <div className={s.root}>
      <div className={s.scroller} role="region" aria-label={ariaLabel} tabIndex={0}>
        <table className={s.table}>
          <thead>
            {multiCols ? (
              <tr>
                <th className={s.corner} rowSpan={2}>{rowTitle}</th>
                {vm.paths.map((path) => (
                  <th key={path.join("|")} className={s.colHead} colSpan={values.length}>
                    {path.join(" · ")}
                  </th>
                ))}
                <th className={s.colHead} colSpan={values.length}>{labels.total}</th>
              </tr>
            ) : null}
            <tr>
              {multiCols ? null : <th className={s.corner}>{rowTitle}</th>}
              {[...vm.paths, null].flatMap((path, pi) =>
                multiCols || path !== null
                  ? values.map((item) => (
                      <th key={`${pi}-${item.field}`} className={s.valueHead} style={{ top: multiCols ? 36 : 0 }}>
                        {valueHeader(item)}
                      </th>
                    ))
                  : [],
              )}
            </tr>
          </thead>
          <tbody>
            {vm.lines.map(({ node, open, hasChildren }) => (
              <tr key={node.path}>
                <th scope="row" className={s.label({ total: false })} style={{ paddingInlineStart: 8 + node.level * 18 }}>
                  <div className={s.labelInner}>
                    {hasChildren ? (
                      <button
                        type="button"
                        className={s.toggle}
                        aria-expanded={open}
                        aria-label={open ? labels.collapse : labels.expand}
                        onClick={() => vm.toggle(node.path)}
                      >
                        <Icon name={open ? "chevron-down" : "chevron-forward"} size="xs" />
                      </button>
                    ) : (
                      <span className={s.toggleSpacer} />
                    )}
                    {node.key || "—"}
                  </div>
                </th>
                {[...vm.paths, null].flatMap((path, pi) =>
                  multiCols || path !== null
                    ? values.map((item) => {
                        const v = path ? vm.cell(node.rows, path, item) : vm.cell(node.rows, [], item);
                        return (
                          <td
                            key={`${pi}-${item.field}`}
                            className={s.value({ highlight: vm.highlight(path ? node : null, pi, item, v), group: hasChildren, total: path === null })}
                          >
                            {show(item, v)}
                          </td>
                        );
                      })
                    : [],
                )}
              </tr>
            ))}
            <tr>
              <th scope="row" className={s.label({ total: true })}>{labels.total}</th>
              {[...vm.paths, null].flatMap((path, pi) =>
                multiCols || path !== null
                  ? values.map((item) => (
                      <td key={`total-${pi}-${item.field}`} className={s.value({ total: true })}>
                        {show(item, path ? vm.cell(vm.data, path, item) : vm.cell(vm.data, [], item))}
                      </td>
                    ))
                  : [],
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
