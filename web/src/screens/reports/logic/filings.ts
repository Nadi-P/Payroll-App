import type { AnnualSummary, EmployeeRecord, Payslip, Period, RunResult, YearMonth } from "@/api/types.generated";
import type { TableColumn } from "@/components/data/data-table/dataTable.types";

type T = (key: string, values?: Record<string, string | number>) => string;

export type FilingId =
  | "form102"
  | "form100"
  | "funds"
  | "payslips"
  | "bl126"
  | "form126"
  | "form106"
  | "form161"
  | "wages";

export type Frequency = "monthly" | "halfYear" | "annual" | "event";

export const FILINGS: { id: FilingId; frequency: Frequency }[] = [
  { id: "form102", frequency: "monthly" },
  { id: "form100", frequency: "monthly" },
  { id: "funds", frequency: "monthly" },
  { id: "payslips", frequency: "monthly" },
  { id: "bl126", frequency: "halfYear" },
  { id: "form126", frequency: "annual" },
  { id: "form106", frequency: "annual" },
  { id: "form161", frequency: "event" },
  { id: "wages", frequency: "event" },
];

/** ready = final figures; partial = some months still open; draft = month not approved. */
export type FilingStatus = "ready" | "partial" | "draft" | "empty" | "none";

/** One row of a filing's detail table: an employee (or a month) and its figures. */
export interface FilingRow {
  id: string;
  employeeId: string;
  name: string;
  nationalId: string;
  text: Record<string, string>;
  values: Record<string, number>;
}

export interface Figure {
  key: string;
  label: string;
  value: number;
  format: "money" | "count";
}

export interface FilingModel {
  figures: Figure[];
  total?: Figure;
  rows: FilingRow[];
  columns: TableColumn<FilingRow>[];
  status: FilingStatus;
  /** e.g. "3 of 6 months approved". */
  statusDetail?: string;
}

const n = (v: string | null | undefined) => Number(v ?? 0);
const sumRows = (rows: FilingRow[], key: string) => rows.reduce((a, r) => a + (r.values[key] ?? 0), 0);

export interface FilingCtx {
  t: T;
  formatDate: (iso: string | null | undefined) => string;
  monthName: (m: number) => string;
  employees: Map<string, EmployeeRecord>;
}

function person(ctx: FilingCtx, employeeId: string) {
  const r = ctx.employees.get(employeeId);
  return {
    employeeId,
    name: r ? `${r.profile.first_name} ${r.profile.last_name}` : employeeId,
    nationalId: r?.profile.national_id ?? "",
  };
}

// ---- columns ---------------------------------------------------------------------------------

export function personColumns(t: T): TableColumn<FilingRow>[] {
  return [
    { id: "name", header: t("employees.columns.name"), sticky: true, width: "11rem", value: (r) => r.name },
    { id: "nationalId", header: t("employees.columns.nationalId"), width: "8rem", value: (r) => r.nationalId },
  ];
}
const money = (id: string, header: string, total = true): TableColumn<FilingRow> => ({
  id,
  header,
  format: "money",
  total,
  value: (r) => r.values[id] ?? 0,
});
const count = (id: string, header: string, total = false): TableColumn<FilingRow> => ({
  id,
  header,
  format: "number",
  total,
  value: (r) => r.values[id] ?? 0,
});
const text = (id: string, header: string): TableColumn<FilingRow> => ({ id, header, value: (r) => r.text[id] ?? "" });

// ---- monthly ---------------------------------------------------------------------------------

function insuranceValues(p: Payslip) {
  return {
    gross: n(p.bases.gross_cash),
    insurable: n(p.national_insurance.insurable),
    tax: n(p.income_tax.tax),
    blEmployee: n(p.national_insurance.bl_employee),
    health: n(p.national_insurance.health_employee),
    blEmployer: n(p.national_insurance.bl_employer),
  };
}

function monthStatus(run: RunResult | undefined): FilingStatus {
  if (!run?.payslips.length) return "empty";
  return run.status === "approved" ? "ready" : "draft";
}

export function form102(ctx: FilingCtx, run: RunResult | undefined): FilingModel {
  const { t } = ctx;
  const f = run?.form102;
  const rows: FilingRow[] = (run?.payslips ?? []).map((p) => ({
    id: p.employee_id,
    ...person(ctx, p.employee_id),
    text: {},
    values: insuranceValues(p),
  }));
  const figure = (key: string, label: string, value: string | number | undefined, format: Figure["format"] = "money") => ({
    key,
    label,
    value: Number(value ?? 0),
    format,
  });
  const total = n(f?.tax_withheld) + n(f?.bl_employee) + n(f?.health_employee) + n(f?.bl_employer);
  return {
    status: monthStatus(run),
    figures: f
      ? [
          figure("employees", t("reports.form102.employees"), f.employees, "count"),
          figure("gross", t("reports.form102.gross"), f.gross_total),
          figure("insurable", t("reports.form102.insurable"), f.insurable_total),
          figure("tax", t("reports.form102.tax"), f.tax_withheld),
          figure("blEmployee", t("reports.form102.blEmployee"), f.bl_employee),
          figure("health", t("reports.form102.health"), f.health_employee),
          figure("blEmployer", t("reports.form102.blEmployer"), f.bl_employer),
        ]
      : [],
    total: f ? figure("total", t("reports.form102.total"), total) : undefined,
    rows,
    columns: [
      ...personColumns(t),
      money("gross", t("payroll.stats.gross")),
      money("insurable", t("reports.form102.insurable")),
      money("tax", t("parts.incomeTax")),
      money("blEmployee", t("parts.blEmployee")),
      money("health", t("parts.health")),
      money("blEmployer", t("parts.blEmployer")),
    ],
  };
}

export function form100(ctx: FilingCtx, run: RunResult | undefined, period: Period): FilingModel {
  const { t } = ctx;
  const ym = `${period.year}-${String(period.month).padStart(2, "0")}`;
  const rows: FilingRow[] = (run?.payslips ?? []).map((p) => {
    const r = ctx.employees.get(p.employee_id);
    const start = r?.employee.start_date ?? "";
    const end = r?.employee.end_date ?? "";
    return {
      id: p.employee_id,
      ...person(ctx, p.employee_id),
      text: {
        start: ctx.formatDate(start),
        // Only a start or end inside this month is news to Bituach Leumi.
        event: start.startsWith(ym) ? t("exports.form100.joined") : end.startsWith(ym) ? t("exports.form100.left") : "",
        category: t(`exports.categories.${p.national_insurance.category}`),
        kind: r ? t(`employee.kinds.${r.employee.kind}`) : "",
      },
      values: {
        ...insuranceValues(p),
        fraction: n(r?.employee.job_fraction ?? "1") * 100,
      },
    };
  });
  const insurance = sumRows(rows, "blEmployee") + sumRows(rows, "health") + sumRows(rows, "blEmployer");
  return {
    status: monthStatus(run),
    figures: [
      { key: "employees", label: t("reports.form102.employees"), value: rows.length, format: "count" },
      { key: "joined", label: t("exports.form100.joiners"), value: rows.filter((r) => r.text.event === t("exports.form100.joined")).length, format: "count" },
      { key: "insurable", label: t("reports.form102.insurable"), value: sumRows(rows, "insurable"), format: "money" },
      { key: "blEmployee", label: t("reports.form102.blEmployee"), value: sumRows(rows, "blEmployee"), format: "money" },
      { key: "health", label: t("reports.form102.health"), value: sumRows(rows, "health"), format: "money" },
      { key: "blEmployer", label: t("reports.form102.blEmployer"), value: sumRows(rows, "blEmployer"), format: "money" },
    ],
    total: { key: "total", label: t("exports.form100.total"), value: insurance, format: "money" },
    rows,
    columns: [
      ...personColumns(t),
      text("start", t("exports.fields.startDate")),
      text("event", t("exports.form100.event")),
      text("kind", t("terms.kind")),
      { id: "fraction", header: t("exports.fields.jobFraction"), format: "percent", value: (r) => r.values.fraction ?? 0 },
      text("category", t("exports.fields.category")),
      money("gross", t("payroll.stats.gross")),
      money("insurable", t("reports.form102.insurable")),
      money("blEmployee", t("parts.blEmployee")),
      money("health", t("parts.health")),
      money("blEmployer", t("parts.blEmployer")),
    ],
  };
}

export function funds(ctx: FilingCtx, run: RunResult | undefined): FilingModel {
  const { t } = ctx;
  const rows: FilingRow[] = (run?.payslips ?? [])
    .map((p) => {
      const c = p.contributions;
      const values = {
        pensionBase: n(p.bases.pension),
        pensionEmployee: n(c.pension_employee),
        pensionEmployer: n(c.pension_employer),
        severance: n(c.severance_employer),
        studyBase: n(p.bases.study_fund),
        studyEmployee: n(c.study_fund_employee),
        studyEmployer: n(c.study_fund_employer),
      };
      const deposits =
        values.pensionEmployee + values.pensionEmployer + values.severance + values.studyEmployee + values.studyEmployer;
      return { id: p.employee_id, ...person(ctx, p.employee_id), text: {}, values: { ...values, deposits } };
    })
    .filter((r) => (r.values.deposits ?? 0) > 0.005);
  const figure = (key: string, label: string): Figure => ({ key, label, value: sumRows(rows, key), format: "money" });
  return {
    status: monthStatus(run),
    figures: [
      { key: "employees", label: t("exports.funds.employees"), value: rows.length, format: "count" },
      figure("pensionEmployee", t("parts.pensionEmployee")),
      figure("pensionEmployer", t("parts.pensionEmployer")),
      figure("severance", t("parts.severance")),
      figure("studyEmployee", t("parts.studyEmployee")),
      figure("studyEmployer", t("parts.studyEmployer")),
    ],
    total: figure("deposits", t("exports.funds.total")),
    rows,
    columns: [
      ...personColumns(t),
      money("pensionBase", t("reports.funds.pensionBase"), false),
      money("pensionEmployee", t("parts.pensionEmployee")),
      money("pensionEmployer", t("parts.pensionEmployer")),
      money("severance", t("parts.severance")),
      money("studyBase", t("reports.funds.studyBase"), false),
      money("studyEmployee", t("parts.studyEmployee")),
      money("studyEmployer", t("parts.studyEmployer")),
      money("deposits", t("exports.funds.total")),
    ],
  };
}

export function payslips(ctx: FilingCtx, run: RunResult | undefined): FilingModel {
  const { t } = ctx;
  const sent = new Set(run?.production.sent_ids ?? []);
  const produced = new Set(run?.production.produced_ids ?? []);
  const rows: FilingRow[] = (run?.payslips ?? []).map((p) => ({
    id: p.employee_id,
    ...person(ctx, p.employee_id),
    text: {
      state: sent.has(p.employee_id)
        ? t("exports.payslips.sent")
        : produced.has(p.employee_id)
          ? t("exports.payslips.produced")
          : t("exports.payslips.notProduced"),
    },
    values: { gross: n(p.bases.gross_cash), net: n(p.net_pay) },
  }));
  const p = run?.production;
  const allSent = !!p && p.expected > 0 && p.sent >= p.expected;
  return {
    status: !run?.payslips.length ? "empty" : allSent ? "ready" : run.status === "approved" ? "partial" : "draft",
    statusDetail: p && !allSent && p.expected ? t("exports.payslips.sentOf", { sent: p.sent, total: p.expected }) : undefined,
    figures: [
      { key: "expected", label: t("exports.payslips.expected"), value: p?.expected ?? 0, format: "count" },
      { key: "produced", label: t("exports.payslips.producedCount"), value: p?.produced ?? 0, format: "count" },
      { key: "sent", label: t("exports.payslips.sentCount"), value: p?.sent ?? 0, format: "count" },
    ],
    total: { key: "net", label: t("exports.payslips.netTotal"), value: sumRows(rows, "net"), format: "money" },
    rows,
    columns: [...personColumns(t), money("gross", t("payroll.stats.gross")), money("net", t("payroll.stats.net")), text("state", t("exports.payslips.state"))],
  };
}

// ---- half year and annual ------------------------------------------------------------------

/** Bituach Leumi's half-year Form 126: January to June, per employee. */
export function bl126(ctx: FilingCtx, months: YearMonth[]): FilingModel {
  const { t } = ctx;
  const half = months.filter((m) => m.period.month <= 6);
  const approved = half.filter((m) => m.status === "approved");
  const byEmployee = new Map<string, FilingRow>();
  for (const m of approved)
    for (const p of m.payslips) {
      const row = byEmployee.get(p.employee_id) ?? { id: p.employee_id, ...person(ctx, p.employee_id), text: {}, values: { months: 0 } };
      const v = insuranceValues(p);
      row.values.months = (row.values.months ?? 0) + 1;
      for (const [k, x] of Object.entries(v)) row.values[k] = (row.values[k] ?? 0) + x;
      byEmployee.set(p.employee_id, row);
    }
  const rows = [...byEmployee.values()].sort((a, b) => a.name.localeCompare(b.name));
  const total = sumRows(rows, "blEmployee") + sumRows(rows, "health") + sumRows(rows, "blEmployer");
  return {
    status: approved.length === 0 ? "empty" : approved.length === 6 ? "ready" : "partial",
    statusDetail: approved.length && approved.length < 6 ? t("exports.monthsApproved", { count: approved.length, total: 6 }) : undefined,
    figures: [
      { key: "employees", label: t("reports.form102.employees"), value: rows.length, format: "count" },
      { key: "gross", label: t("reports.form102.gross"), value: sumRows(rows, "gross"), format: "money" },
      { key: "insurable", label: t("reports.form102.insurable"), value: sumRows(rows, "insurable"), format: "money" },
      { key: "blEmployee", label: t("reports.form102.blEmployee"), value: sumRows(rows, "blEmployee"), format: "money" },
      { key: "health", label: t("reports.form102.health"), value: sumRows(rows, "health"), format: "money" },
      { key: "blEmployer", label: t("reports.form102.blEmployer"), value: sumRows(rows, "blEmployer"), format: "money" },
    ],
    total: { key: "total", label: t("exports.form100.total"), value: total, format: "money" },
    rows,
    columns: [
      ...personColumns(t),
      count("months", t("reports.annual.months")),
      money("gross", t("payroll.stats.gross")),
      money("insurable", t("reports.form102.insurable")),
      money("blEmployee", t("parts.blEmployee")),
      money("health", t("parts.health")),
      money("blEmployer", t("parts.blEmployer")),
    ],
  };
}

function summaryValues(s: AnnualSummary) {
  return {
    months: s.months,
    gross: n(s.gross_cash),
    benefits: n(s.benefits),
    taxable: n(s.taxable),
    tax: n(s.tax_withheld),
    blEmployee: n(s.bl_employee),
    health: n(s.health_employee),
    blEmployer: n(s.bl_employer),
    pensionEmployee: n(s.pension_employee),
    pensionEmployer: n(s.pension_employer),
    severance: n(s.severance_employer),
    studyEmployee: n(s.study_fund_employee),
    studyEmployer: n(s.study_fund_employer),
    creditPoints: n(s.credit_points_amount),
    pensionCredit: n(s.pension_credit),
  };
}

function annualStatus(t: T, covered: number): Pick<FilingModel, "status" | "statusDetail"> {
  if (!covered) return { status: "empty" };
  if (covered >= 12) return { status: "ready" };
  return { status: "partial", statusDetail: t("exports.monthsApproved", { count: covered, total: 12 }) };
}

export function form126(ctx: FilingCtx, summaries: AnnualSummary[], covered: number): FilingModel {
  const { t } = ctx;
  const rows: FilingRow[] = summaries
    .map((s) => ({ id: s.employee_id, ...person(ctx, s.employee_id), text: {}, values: summaryValues(s) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    ...annualStatus(t, covered),
    figures: [
      { key: "employees", label: t("reports.form102.employees"), value: rows.length, format: "count" },
      { key: "gross", label: t("reports.form102.gross"), value: sumRows(rows, "gross"), format: "money" },
      { key: "taxable", label: t("payslip.taxable"), value: sumRows(rows, "taxable"), format: "money" },
      { key: "blEmployee", label: t("reports.form102.blEmployee"), value: sumRows(rows, "blEmployee"), format: "money" },
      { key: "health", label: t("reports.form102.health"), value: sumRows(rows, "health"), format: "money" },
    ],
    total: { key: "tax", label: t("reports.form102.tax"), value: sumRows(rows, "tax"), format: "money" },
    rows,
    columns: [
      ...personColumns(t),
      count("months", t("reports.annual.months")),
      money("gross", t("payroll.stats.gross")),
      money("benefits", t("sections.imputed")),
      money("taxable", t("payslip.taxable")),
      money("tax", t("reports.annual.withheld")),
      money("blEmployee", t("parts.blEmployee")),
      money("health", t("parts.health")),
      money("pensionEmployee", t("parts.pensionEmployee")),
      money("pensionEmployer", t("parts.pensionEmployer")),
      money("severance", t("parts.severance")),
      money("studyEmployee", t("parts.studyEmployee")),
      money("studyEmployer", t("parts.studyEmployer")),
      money("creditPoints", t("exports.fields.creditPoints")),
      money("pensionCredit", t("exports.fields.pensionCredit")),
    ],
  };
}

/** One employee's Form 106: the year's pay, tax and contributions. */
export function form106(ctx: FilingCtx, summary: AnnualSummary | undefined, covered: number): FilingModel {
  const { t } = ctx;
  const v = summary ? summaryValues(summary) : null;
  const m = (key: keyof ReturnType<typeof summaryValues>, label: string): Figure => ({ key, label, value: v?.[key] ?? 0, format: "money" });
  return {
    ...annualStatus(t, covered),
    figures: v
      ? [
          { key: "months", label: t("reports.annual.months"), value: v.months, format: "count" },
          m("gross", t("reports.form102.gross")),
          m("benefits", t("sections.imputed")),
          m("taxable", t("payslip.taxable")),
          m("creditPoints", t("exports.fields.creditPoints")),
          m("pensionCredit", t("exports.fields.pensionCredit")),
          m("blEmployee", t("parts.blEmployee")),
          m("health", t("parts.health")),
          m("pensionEmployee", t("parts.pensionEmployee")),
          m("pensionEmployer", t("parts.pensionEmployer")),
          m("severance", t("parts.severance")),
          m("studyEmployee", t("parts.studyEmployee")),
          m("studyEmployer", t("parts.studyEmployer")),
        ]
      : [],
    total: v ? m("tax", t("reports.annual.withheld")) : undefined,
    rows: [],
    columns: [],
  };
}

// ---- when needed ---------------------------------------------------------------------------

export function form161(ctx: FilingCtx, year: number): FilingModel {
  const { t } = ctx;
  const rows: FilingRow[] = [...ctx.employees.values()]
    .filter((e) => e.employee.end_date && e.employee.end_date.startsWith(String(year)))
    .map((e) => ({
      id: e.employee.employee_id,
      ...person(ctx, e.employee.employee_id),
      text: { start: ctx.formatDate(e.employee.start_date), end: ctx.formatDate(e.employee.end_date) },
      values: {},
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    status: "none",
    figures: [],
    rows,
    columns: [...personColumns(t), text("start", t("exports.fields.startDate")), text("end", t("exports.fields.endDate"))],
  };
}

/** A wage confirmation for a Bituach Leumi claim: the employee's last months of pay. */
export function wages(ctx: FilingCtx, employeeId: string | null, months: YearMonth[], count: number, upTo: Period): FilingModel {
  const { t } = ctx;
  const key = (p: Period) => p.year * 100 + p.month;
  const slips = months
    .filter((m) => m.status === "approved" && key(m.period) <= key(upTo))
    .flatMap((m) => m.payslips.filter((p) => p.employee_id === employeeId).map((p) => ({ period: m.period, p })))
    .sort((a, b) => key(b.period) - key(a.period))
    .slice(0, count)
    .reverse();
  const rows: FilingRow[] = slips.map(({ period, p }) => ({
    id: `${period.year}-${period.month}`,
    ...person(ctx, p.employee_id),
    text: { month: `${ctx.monthName(period.month)} ${period.year}` },
    values: {
      gross: n(p.bases.gross_cash),
      insurable: n(p.national_insurance.insurable),
      blEmployee: n(p.national_insurance.bl_employee),
      health: n(p.national_insurance.health_employee),
    },
  }));
  const gross = sumRows(rows, "gross");
  return {
    status: "none",
    figures: [
      { key: "months", label: t("reports.annual.months"), value: rows.length, format: "count" },
      { key: "gross", label: t("reports.form102.gross"), value: gross, format: "money" },
      { key: "insurable", label: t("reports.form102.insurable"), value: sumRows(rows, "insurable"), format: "money" },
    ],
    total: { key: "average", label: t("exports.wages.average"), value: rows.length ? gross / rows.length : 0, format: "money" },
    rows,
    columns: [
      { id: "month", header: t("dataHistory.fields.month"), sticky: true, width: "10rem", value: (r) => r.text.month ?? "" },
      money("gross", t("payroll.stats.gross")),
      money("insurable", t("reports.form102.insurable")),
      money("blEmployee", t("parts.blEmployee")),
      money("health", t("parts.health")),
    ],
  };
}
