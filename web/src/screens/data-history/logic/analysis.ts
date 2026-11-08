import type { ChartColor } from "@/components/charts/chart.types";
import type { ReportRow } from "@/components/data/report-view/reportView.types";
import type { BaseReportId } from "./baseReports";

export type Fmt = "money" | "days" | "count" | "percent";

export interface AnalysisStat {
  id: string;
  label: string;
  value: number;
  format: Fmt;
}

export type AnalysisBlock =
  | {
      kind: "trend";
      id: string;
      title: string;
      data: Record<string, string | number>[];
      series: { key: string; label: string; color: ChartColor }[];
      stacked?: boolean;
      format: Fmt;
    }
  | { kind: "share"; id: string; title: string; slices: { key: string; label: string; value: number }[]; format: Fmt }
  | { kind: "ranking"; id: string; title: string; data: { label: string; value: number }[]; seriesLabel: string; format: Fmt; color?: ChartColor };

export interface AnalysisModel {
  stats: AnalysisStat[];
  blocks: AnalysisBlock[];
}

type T = (key: string) => string;
const num = (v: unknown) => (typeof v === "number" ? v : 0);
const sum = (rows: ReportRow[], field: string) => rows.reduce((a, r) => a + num(r[field]), 0);
const distinct = (rows: ReportRow[], key: (r: ReportRow) => string) => new Set(rows.map(key)).size;
const monthKey = (r: ReportRow) => Number(r.year) * 100 + Number(r.month);

/** One chart row per month in the data (across years), oldest first. */
function byMonth(rows: ReportRow[], fields: string[]) {
  const keys = [...new Set(rows.map(monthKey))].sort((a, b) => a - b);
  return keys.map((k) => {
    const of = rows.filter((r) => monthKey(r) === k);
    const label = `${String(k % 100).padStart(2, "0")}/${Math.floor(k / 100)}`;
    return { month: label, ...Object.fromEntries(fields.map((f) => [f, sum(of, f)])) };
  });
}

/** Totals per group, largest first; past `limit` the rest fold into "other". */
function totalsBy(rows: ReportRow[], key: string, value: string, limit: number, other: string) {
  const out = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[key] ?? "—") || "—";
    out.set(k, (out.get(k) ?? 0) + num(r[value]));
  }
  const list = [...out].map(([label, v]) => ({ key: label, label, value: v })).sort((a, b) => b.value - a.value);
  if (list.length <= limit) return list;
  const rest = list.slice(limit - 1).reduce((a, x) => a + x.value, 0);
  return [...list.slice(0, limit - 1), { key: "__other", label: other, value: rest }];
}

const top = (rows: ReportRow[], key: string, value: string, n = 10) =>
  totalsBy(rows, key, value, 1_000_000, "")
    .filter((x) => Math.abs(x.value) > 0.005)
    .slice(0, n)
    .map(({ label, value: v }) => ({ label, value: v }));

/** What each report's numbers say: key figures and the charts an accountant checks first. */
export function analyze(report: BaseReportId, rows: ReportRow[], t: T): AnalysisModel {
  const f = (id: string) => t(`dataHistory.fields.${id}`);
  const a = (id: string) => t(`dataHistory.analysis.${id}`);
  const other = a("other");
  const people = distinct(rows, (r) => String(r.employee_number));
  const employeeMonths = distinct(rows, (r) => `${r.employee_number}|${monthKey(r)}`);

  switch (report) {
    case "components":
    case "imputed":
    case "deductions": {
      const total = sum(rows, "total");
      return {
        stats: [
          { id: "total", label: a(`${report}Total`), value: total, format: "money" },
          { id: "people", label: a("employees"), value: people, format: "count" },
          { id: "avg", label: a("perEmployeeMonth"), value: employeeMonths ? total / employeeMonths : 0, format: "money" },
          { id: "items", label: a("items"), value: distinct(rows, (r) => String(r.code)), format: "count" },
        ],
        blocks: [
          { kind: "trend", id: "trend", title: a("byMonth"), data: byMonth(rows, ["total"]), series: [{ key: "total", label: f("total"), color: 1 }], format: "money" },
          { kind: "share", id: "items", title: a("byItem"), slices: totalsBy(rows, "component_name", "total", 8, other), format: "money" },
          { kind: "ranking", id: "people", title: a("topEmployees"), data: top(rows, "employee_name", "total"), seriesLabel: f("total"), format: "money" },
          { kind: "share", id: "departments", title: a("byDepartment"), slices: totalsBy(rows, "department", "total", 8, other), format: "money" },
        ],
      };
    }
    case "costing": {
      const cost = sum(rows, "employer_cost");
      const gross = sum(rows, "gross");
      const reserves = sum(rows, "severance_reserve") + sum(rows, "vacation_reserve") + sum(rows, "recuperation_reserve");
      const parts = ["net", "income_tax", "bl_employee", "funds_employee", "voluntary_deductions", "bl_employer", "funds_employer"];
      return {
        stats: [
          { id: "cost", label: f("employer_cost"), value: cost, format: "money" },
          { id: "gross", label: f("gross"), value: gross, format: "money" },
          { id: "onTop", label: a("onTop"), value: gross ? ((cost - gross) / gross) * 100 : 0, format: "percent" },
          { id: "reserves", label: a("reserves"), value: reserves, format: "money" },
        ],
        blocks: [
          {
            kind: "trend",
            id: "composition",
            title: a("costByMonth"),
            stacked: true,
            data: byMonth(rows, parts),
            series: parts.map((p, i) => ({ key: p, label: f(p), color: ((i % 10) + 1) as ChartColor })),
            format: "money",
          },
          { kind: "share", id: "departments", title: a("byDepartment"), slices: totalsBy(rows, "department", "employer_cost", 8, other), format: "money" },
          { kind: "ranking", id: "people", title: a("topEmployees"), data: top(rows, "employee_name", "employer_cost"), seriesLabel: f("employer_cost"), format: "money" },
          {
            kind: "trend",
            id: "reserves",
            title: a("reservesByMonth"),
            stacked: true,
            data: byMonth(rows, ["severance_reserve", "vacation_reserve", "recuperation_reserve"]),
            series: [
              { key: "severance_reserve", label: f("severance_reserve"), color: 4 },
              { key: "vacation_reserve", label: f("vacation_reserve"), color: 2 },
              { key: "recuperation_reserve", label: f("recuperation_reserve"), color: 3 },
            ],
            format: "money",
          },
        ],
      };
    }
    case "funds":
      return {
        stats: [
          { id: "total", label: f("total_both"), value: sum(rows, "total"), format: "money" },
          { id: "employee", label: f("total_employee"), value: sum(rows, "total_employee"), format: "money" },
          { id: "employer", label: f("total_employer"), value: sum(rows, "total_employer"), format: "money" },
          { id: "funds", label: a("funds"), value: distinct(rows, (r) => String(r.fund_code)), format: "count" },
        ],
        blocks: [
          {
            kind: "trend",
            id: "trend",
            title: a("depositsByMonth"),
            stacked: true,
            data: byMonth(rows, ["fund_employee", "fund_employer", "severance", "disability_employee", "disability_employer", "other_employee", "other_employer"]),
            series: [
              { key: "fund_employee", label: f("fund_employee"), color: 1 },
              { key: "fund_employer", label: f("fund_employer"), color: 2 },
              { key: "severance", label: f("severance"), color: 4 },
              { key: "disability_employee", label: f("disability_employee"), color: 5 },
              { key: "disability_employer", label: f("disability_employer"), color: 7 },
              { key: "other_employee", label: f("other_employee"), color: 3 },
              { key: "other_employer", label: f("other_employer"), color: 6 },
            ],
            format: "money",
          },
          { kind: "share", id: "funds", title: a("byFund"), slices: totalsBy(rows, "fund_name", "total", 8, other), format: "money" },
          { kind: "share", id: "kinds", title: a("byFundKind"), slices: totalsBy(rows, "fund_kind", "total", 8, other), format: "money" },
          { kind: "ranking", id: "people", title: a("topEmployees"), data: top(rows, "employee_name", "total"), seriesLabel: f("total_both"), format: "money" },
        ],
      };
    case "absences": {
      // Balances are states: each employee's latest month counts, not the sum of months.
      const latest = new Map<string, ReportRow>();
      for (const r of rows) {
        const cur = latest.get(String(r.employee_number));
        if (!cur || monthKey(r) > monthKey(cur)) latest.set(String(r.employee_number), r);
      }
      const last = [...latest.values()];
      return {
        stats: [
          { id: "vacation", label: f("vacation.used"), value: sum(rows, "vacation_used"), format: "days" },
          { id: "sick", label: f("sick.used"), value: sum(rows, "sick_used"), format: "days" },
          { id: "reserve", label: f("reserve_used"), value: sum(rows, "reserve_used"), format: "days" },
          { id: "owed", label: a("vacationOwed"), value: sum(last, "vacation_balance"), format: "days" },
        ],
        blocks: [
          {
            kind: "trend",
            id: "used",
            title: a("usedByMonth"),
            stacked: true,
            data: byMonth(rows, ["vacation_used", "sick_used", "recuperation_used", "reserve_used"]),
            series: [
              { key: "vacation_used", label: t("absences.vacation"), color: 2 },
              { key: "sick_used", label: t("absences.sick"), color: 5 },
              { key: "recuperation_used", label: t("absences.recuperation"), color: 3 },
              { key: "reserve_used", label: t("absences.reserve"), color: 4 },
            ],
            format: "days",
          },
          { kind: "ranking", id: "balances", title: a("topVacation"), data: top(last, "employee_name", "vacation_balance"), seriesLabel: f("vacation.balance"), format: "days", color: 2 },
          { kind: "ranking", id: "sick", title: a("topSick"), data: top(rows, "employee_name", "sick_used"), seriesLabel: f("sick.used"), format: "days", color: 5 },
          { kind: "share", id: "departments", title: a("vacationByDepartment"), slices: totalsBy(rows, "department", "vacation_used", 8, other), format: "days" },
        ],
      };
    }
  }
}
