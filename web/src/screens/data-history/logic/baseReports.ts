import type { ReportRow as ApiRow } from "@/api/queries";
import type { ReportConfig, ReportField, ReportRow } from "@/components/data/report-view/reportView.types";
import { EMPTY_CONFIG } from "@/components/data/report-view/reportView.types";
import type { IconName } from "@/components/typography/icon/icon.logic";

export const BASE_REPORTS = ["components", "imputed", "deductions", "costing", "funds", "absences"] as const;
export type BaseReportId = (typeof BASE_REPORTS)[number];
export const isBaseReport = (v: string | null): v is BaseReportId => BASE_REPORTS.includes(v as BaseReportId);

type T = (key: string) => string;
type Kind = ReportField["type"];

const HEAD: [string, Kind][] = [
  ["year", "id"],
  ["employee_number", "id"],
  ["employee_name", "text"],
  ["department", "text"],
  ["month", "id"],
];
const TAIL: [string, Kind][] = [
  ["quarter", "id"],
  ["half", "id"],
  ["sub_department", "text"],
  ["national_id", "id"],
  ["company_name", "text"],
];
const LINES: [string, Kind][] = [
  ["code", "id"],
  ["component_name", "text"],
  ["rate", "money"],
  ["quantity", "quantity"],
  ["total", "money"],
  ["standing", "text"],
];
const COSTING: [string, Kind][] = [
  ["gross", "money"],
  ["bl_employee", "money"],
  ["income_tax", "money"],
  ["funds_employee", "money"],
  ["voluntary_deductions", "money"],
  ["net", "money"],
  ["bl_employer", "money"],
  ["funds_employer", "money"],
  ["severance_reserve", "money"],
  ["vacation_reserve", "money"],
  ["recuperation_reserve", "money"],
  ["employer_cost", "money"],
  ["bl_foreign_exemption", "money"],
  ["organization_tax", "money"],
  ["advance", "money"],
  ["hours", "quantity"],
  ["days", "quantity"],
];
const FUNDS: [string, Kind][] = [
  ["fund_code", "id"],
  ["fund_name", "text"],
  ["fund_kind", "text"],
  ["fund_salary", "money"],
  ["fund_employee", "money"],
  ["disability_employee", "money"],
  ["other_employee", "money"],
  ["total_employee", "money"],
  ["fund_employer", "money"],
  ["disability_employer", "money"],
  ["other_employer", "money"],
  ["severance", "money"],
  ["total_employer", "money"],
  ["total", "money"],
  ["member_number", "id"],
  ["branch", "id"],
  ["work_days", "quantity"],
  ["amounts_ref", "text"],
  ["group", "id"],
];
const balance = (kind: string): [string, Kind][] => [
  [`${kind}_code`, "id"],
  [`${kind}_name`, "text"],
  [`${kind}_year_opening`, "quantity"],
  [`${kind}_adjustment`, "quantity"],
  [`${kind}_previous`, "quantity"],
  [`${kind}_latest`, "quantity"],
  [`${kind}_accrued`, "quantity"],
  [`${kind}_used`, "quantity"],
  [`${kind}_balance`, "quantity"],
];
const ABSENCES: [string, Kind][] = [
  ["calendar_month", "id"],
  ...balance("vacation"),
  ...balance("sick"),
  ...balance("recuperation"),
  ["reserve_used", "quantity"],
];

const COLUMNS: Record<BaseReportId, [string, Kind][]> = {
  components: [...HEAD, ...LINES, ...TAIL],
  imputed: [...HEAD, ...LINES, ...TAIL],
  deductions: [...HEAD, ...LINES, ...TAIL],
  costing: [...HEAD, ...COSTING, ...TAIL],
  funds: [...HEAD, ...FUNDS, ...TAIL],
  absences: [...HEAD, ...ABSENCES, ...TAIL],
};

export const REPORT_ICONS: Record<BaseReportId, IconName> = {
  components: "wallet",
  imputed: "receipt",
  deductions: "list-checks",
  costing: "building",
  funds: "piggy-bank",
  absences: "calendar",
};

/** The report's columns, in the Shiklulit order, with headers in the user's language. */
export function reportFields(report: BaseReportId, t: T): ReportField[] {
  // The funds report's total is employee and employer together, and says so.
  const key = (id: string) => (report === "funds" && id === "total" ? "total_both" : fieldKey(id));
  return COLUMNS[report].map(([id, type]) => ({ id, label: t(`dataHistory.fields.${key(id)}`), type }));
}

/** Several columns share a header ("name of the absence type"): one message each, not one per kind. */
function fieldKey(id: string): string {
  const m = /^(vacation|sick|recuperation)_(code|name|year_opening|adjustment|previous|latest|accrued|used|balance)$/.exec(id);
  return m ? `${m[1]}.${m[2]}` : id;
}

const NUMERIC = new Set(["money", "quantity"]);

/** An API row as the report shows it: numbers as numbers, codes with their names. */
export function toRow(report: BaseReportId, row: ApiRow, ctx: { t: T; nameOf: (code: string) => string; yes: string }): ReportRow {
  const out: ReportRow = {};
  for (const [id, type] of COLUMNS[report]) {
    const v = row[id];
    if (NUMERIC.has(type)) out[id] = v === null || v === undefined || v === "" ? null : Number(v);
    else if (typeof v === "boolean") out[id] = v ? ctx.yes : "";
    else out[id] = v === undefined ? null : (v as string | number | null);
  }
  if ("code" in out && out.code !== null) out.component_name = ctx.nameOf(String(out.code));
  if (report === "funds" && out.fund_kind) out.fund_kind = ctx.t(`funds.kinds.${out.fund_kind}`);
  if (report === "absences") {
    out.vacation_name = ctx.t("absences.vacation");
    out.sick_name = ctx.t("absences.sick");
    out.recuperation_name = ctx.t("absences.recuperation");
  }
  return out;
}

/** How a report opens before the user changes anything. */
export function defaultConfig(report: BaseReportId): ReportConfig {
  const table = { ...EMPTY_CONFIG.table, pinned: ["employee_number", "employee_name"] };
  const base = { ...EMPTY_CONFIG, table };
  switch (report) {
    case "components":
    case "imputed":
    case "deductions":
      return { ...base, rows: ["component_name"], columns: ["month"], values: [{ field: "total", aggregation: "sum" }] };
    case "costing":
      return {
        ...base,
        rows: ["department", "employee_name"],
        values: [
          { field: "gross", aggregation: "sum" },
          { field: "net", aggregation: "sum" },
          { field: "employer_cost", aggregation: "sum" },
        ],
      };
    case "funds":
      return {
        ...base,
        rows: ["fund_name", "employee_name"],
        values: [
          { field: "total_employee", aggregation: "sum" },
          { field: "total_employer", aggregation: "sum" },
          { field: "total", aggregation: "sum" },
        ],
      };
    case "absences":
      return {
        ...base,
        rows: ["department", "employee_name"],
        values: [
          { field: "vacation_used", aggregation: "sum" },
          { field: "sick_used", aggregation: "sum" },
          { field: "recuperation_used", aggregation: "sum" },
          { field: "reserve_used", aggregation: "sum" },
        ],
      };
  }
}
