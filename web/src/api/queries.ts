"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { periodKey } from "@/lib/period";
import { api } from "./client";
import type {
  AnnualResult,
  Component,
  Company as CompanyRecord,
  CompanySummary,
  CorrectionDiff,
  CustomComponent,
  EntryBatch,
  Liability,
  NewCompany,
  YearData,
  CoverageGap,
  EmployeeRecord,
  Firm,
  Holiday,
  MonthEntry,
  MonthInfo,
  MonthPreview,
  MonthView,
  OpenMonths,
  Payslip,
  PortfolioRow,
  PreviewRequest,
  TermChange,
  User,
  PayslipInput,
  Period,
  RuleEntry,
  RulesMeta,
  RunResult,
  TerminationRequest,
  TerminationResult,
} from "./types.generated";

export const keys = {
  firms: ["firms"] as const,
  portfolio: (firmId: string, p: Period) => ["portfolio", firmId, periodKey(p)] as const,
  company: (id: string) => ["company", id] as const,
  employees: (id: string) => ["employees", id] as const,
  employee: (cid: string, eid: string) => ["employee", cid, eid] as const,
  payslips: (cid: string, eid: string) => ["payslips", cid, eid] as const,
  months: (cid: string) => ["months", cid] as const,
  month: (cid: string, p: Period) => ["month", cid, periodKey(p)] as const,
  run: (cid: string, p: Period) => ["run", cid, periodKey(p)] as const,
  corrections: (cid: string, p: Period) => ["corrections", cid, periodKey(p)] as const,
  annual: (cid: string, year: number) => ["annual", cid, year] as const,
  rules: ["rules"] as const,
  coverage: (first: string, last: string) => ["coverage", first, last] as const,
  catalog: (on: string) => ["catalog", on] as const,
  companyCatalog: (cid: string, on: string) => ["company-catalog", cid, on] as const,
  year: (cid: string, year: number) => ["year", cid, year] as const,
  liabilities: (cid: string, p: Period) => ["liabilities", cid, periodKey(p)] as const,
  holidays: (year: number) => ["holidays", year] as const,
  meta: ["meta"] as const,
  users: (firmId: string) => ["users", firmId] as const,
  portfolioRows: (firmId: string) => ["portfolio-rows", firmId] as const,
  openMonths: (cid: string) => ["open-months", cid] as const,
  changes: (cid: string, eid: string) => ["changes", cid, eid] as const,
  report: (cid: string, report: string) => ["report", cid, report] as const,
};

/** One row of a base report: identity columns plus the report's own, as the API sends them. */
export type ReportRow = Record<string, string | number | boolean | null>;

const company = (cid: string) => `/companies/${encodeURIComponent(cid)}`;

export const useFirms = () => useQuery({ queryKey: keys.firms, queryFn: () => api.get<Firm[]>("/firms") });

export const usePortfolio = (firmId: string | undefined, p: Period) =>
  useQuery({
    queryKey: keys.portfolio(firmId ?? "", p),
    queryFn: () => api.get<CompanySummary[]>(`/firms/${firmId}/companies?period=${periodKey(p)}`),
    enabled: !!firmId,
    placeholderData: keepPreviousData,
  });

export const useUsers = (firmId: string | undefined) =>
  useQuery({
    queryKey: keys.users(firmId ?? ""),
    queryFn: () => api.get<User[]>(`/firms/${firmId}/users`),
    enabled: !!firmId,
    staleTime: 5 * 60_000,
  });

/** Every client of the firm, each at its own current month. */
export const usePortfolioRows = (firmId: string | undefined) =>
  useQuery({
    queryKey: keys.portfolioRows(firmId ?? ""),
    queryFn: () => api.get<PortfolioRow[]>(`/firms/${firmId}/portfolio`),
    enabled: !!firmId,
    placeholderData: keepPreviousData,
  });

export const useOpenMonths = (cid: string) =>
  useQuery({
    queryKey: keys.openMonths(cid),
    queryFn: () => api.get<OpenMonths>(`${company(cid)}/open-months`),
    enabled: !!cid,
  });

export const useTermChanges = (cid: string, eid: string) =>
  useQuery({
    queryKey: keys.changes(cid, eid),
    queryFn: () => api.get<TermChange[]>(`${company(cid)}/employees/${encodeURIComponent(eid)}/changes`),
    enabled: !!cid && !!eid,
  });

/** A base report of Data history: rows over every closed month. */
export const useBaseReport = (cid: string, report: string | null) =>
  useQuery({
    queryKey: keys.report(cid, report ?? ""),
    queryFn: () => api.get<{ rows: ReportRow[] }>(`${company(cid)}/reports/${report}`).then((r) => r.rows),
    enabled: !!cid && !!report,
    staleTime: 60_000,
  });

export function useSaveAssignees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cid, assignees }: { cid: string; assignees: string[] }) =>
      api.put<CompanyRecord>(`${company(cid)}/assignees`, { assignees }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio-rows"] }),
  });
}

/** Try unsaved changes on one employee's month; nothing is stored. */
export function usePreview(cid: string, p: Period, eid: string) {
  return useMutation({
    mutationFn: (body: PreviewRequest) =>
      api.post<MonthPreview>(`${company(cid)}/months/${periodKey(p)}/preview/${encodeURIComponent(eid)}`, body),
  });
}

export const useEmployees = (cid: string) =>
  useQuery({ queryKey: keys.employees(cid), queryFn: () => api.get<EmployeeRecord[]>(`${company(cid)}/employees`) });

export const useEmployee = (cid: string, eid: string) =>
  useQuery({
    queryKey: keys.employee(cid, eid),
    queryFn: () => api.get<EmployeeRecord>(`${company(cid)}/employees/${encodeURIComponent(eid)}`),
  });

export const usePayslipHistory = (cid: string, eid: string) =>
  useQuery({
    queryKey: keys.payslips(cid, eid),
    queryFn: () => api.get<Payslip[]>(`${company(cid)}/employees/${encodeURIComponent(eid)}/payslips`),
  });

export const useMonths = (cid: string) =>
  useQuery({ queryKey: keys.months(cid), queryFn: () => api.get<MonthInfo[]>(`${company(cid)}/months`) });

export const useMonth = (cid: string, p: Period) =>
  useQuery({ queryKey: keys.month(cid, p), queryFn: () => api.get<MonthView>(`${company(cid)}/months/${periodKey(p)}`) });

export const useRun = (cid: string, p: Period, enabled = true) =>
  useQuery({
    queryKey: keys.run(cid, p),
    queryFn: () => api.post<RunResult>(`${company(cid)}/months/${periodKey(p)}/run`),
    placeholderData: keepPreviousData,
    retry: false,
    enabled: enabled && !!cid,
  });

export const useCorrections = (cid: string, p: Period) =>
  useQuery({
    queryKey: keys.corrections(cid, p),
    queryFn: () => api.get<CorrectionDiff>(`${company(cid)}/months/${periodKey(p)}/corrections`),
  });

export const useAnnual = (cid: string, year: number, enabled = true) =>
  useQuery({
    queryKey: keys.annual(cid, year),
    queryFn: () => api.get<AnnualResult>(`${company(cid)}/years/${year}/annual`),
    enabled: enabled && !!cid,
  });

export const useRules = () => useQuery({ queryKey: keys.rules, queryFn: () => api.get<RuleEntry[]>("/rules") });

export const useCoverage = (first: string, last: string) =>
  useQuery({
    queryKey: keys.coverage(first, last),
    queryFn: () => api.get<CoverageGap[]>(`/rules/coverage?first=${first}&last=${last}`),
  });

export const useCatalog = (on: string) =>
  useQuery({ queryKey: keys.catalog(on), queryFn: () => api.get<Component[]>(`/catalog?on=${on}`), staleTime: Infinity });

/** The catalog as one company sees it: shipped components plus its own. */
export const useCompanyCatalog = (cid: string, on: string) =>
  useQuery({
    queryKey: keys.companyCatalog(cid, on),
    queryFn: () => api.get<Component[]>(`${company(cid)}/catalog?on=${on}`),
    enabled: !!cid,
    staleTime: 60_000,
  });

export const useYearData = (cid: string, year: number) =>
  useQuery({
    queryKey: keys.year(cid, year),
    queryFn: () => api.get<YearData>(`${company(cid)}/years/${year}/data`),
    enabled: !!cid,
    placeholderData: keepPreviousData,
  });

export const useLiabilities = (cid: string, p: Period, enabled = true) =>
  useQuery({
    queryKey: keys.liabilities(cid, p),
    queryFn: () => api.get<Liability[]>(`${company(cid)}/months/${periodKey(p)}/liabilities`),
    enabled: enabled && !!cid,
    retry: false,
  });

export const useHolidays = (year: number) =>
  useQuery({ queryKey: keys.holidays(year), queryFn: () => api.get<Holiday[]>(`/holidays?year=${year}`), staleTime: Infinity });

export const useMeta = () => useQuery({ queryKey: keys.meta, queryFn: () => api.get<RulesMeta>("/meta") });

export const useSimulation = (input: PayslipInput | null) =>
  useQuery({
    queryKey: ["simulate", input],
    queryFn: () => api.post<Payslip>("/calculate", input),
    enabled: input !== null,
    placeholderData: keepPreviousData,
    retry: false,
  });

function useInvalidateMonth(cid: string, p: Period) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.month(cid, p) }),
      qc.invalidateQueries({ queryKey: keys.run(cid, p) }),
      qc.invalidateQueries({ queryKey: keys.months(cid) }),
      qc.invalidateQueries({ queryKey: keys.corrections(cid, p) }),
      qc.invalidateQueries({ queryKey: ["portfolio"] }),
      qc.invalidateQueries({ queryKey: ["portfolio-rows"] }),
      qc.invalidateQueries({ queryKey: keys.openMonths(cid) }),
      qc.invalidateQueries({ queryKey: ["report", cid] }),
      qc.invalidateQueries({ queryKey: ["year", cid] }),
      qc.invalidateQueries({ queryKey: ["liabilities", cid] }),
    ]);
}

/** Save many employees' entries with one recalculation (a paste, or one change for many). */
export function useSaveEntries(cid: string, p: Period) {
  const invalidate = useInvalidateMonth(cid, p);
  return useMutation({
    scope: { id: `entries-${cid}-${periodKey(p)}` },
    mutationFn: (batch: EntryBatch) => api.put<MonthInfo>(`${company(cid)}/months/${periodKey(p)}/entries`, batch),
    onSuccess: invalidate,
  });
}

export function useCopyPreviousMonth(cid: string, p: Period) {
  const invalidate = useInvalidateMonth(cid, p);
  return useMutation({
    mutationFn: () => api.post<MonthInfo>(`${company(cid)}/months/${periodKey(p)}/copy-previous`),
    onSuccess: invalidate,
  });
}

export function useSaveEntry(cid: string, p: Period) {
  const invalidate = useInvalidateMonth(cid, p);
  return useMutation({
    scope: { id: `entries-${cid}-${periodKey(p)}` }, // one at a time, in the order they were made
    mutationFn: ({ employeeId, entry }: { employeeId: string; entry: MonthEntry }) =>
      api.put<MonthInfo>(`${company(cid)}/months/${periodKey(p)}/entries/${encodeURIComponent(employeeId)}`, entry),
    onSuccess: invalidate,
  });
}

/** Produce and send every payslip of the month (a placeholder until documents exist). */
export function useProduceMonth(cid: string, p: Period) {
  const invalidate = useInvalidateMonth(cid, p);
  return useMutation({
    mutationFn: () => api.post<RunResult>(`${company(cid)}/months/${periodKey(p)}/produce`),
    onSuccess: invalidate,
  });
}

export function useApproveMonth(cid: string, p: Period) {
  const invalidate = useInvalidateMonth(cid, p);
  return useMutation({
    mutationFn: () => api.post<RunResult>(`${company(cid)}/months/${periodKey(p)}/approve`),
    onSuccess: invalidate,
  });
}

export function useReopenMonth(cid: string, p: Period) {
  const invalidate = useInvalidateMonth(cid, p);
  return useMutation({
    mutationFn: () => api.post<MonthInfo>(`${company(cid)}/months/${periodKey(p)}/reopen`),
    onSuccess: invalidate,
  });
}

function useInvalidateCompany() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ["portfolio", "portfolio-rows", "employees", "employee", "run", "month", "year", "liabilities", "company-catalog", "changes", "report"].map((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      ),
    );
}

export function useAddEmployee(cid: string) {
  const invalidate = useInvalidateCompany();
  return useMutation({
    mutationFn: (record: EmployeeRecord) => api.post<EmployeeRecord>(`${company(cid)}/employees`, record),
    onSuccess: invalidate,
  });
}

export function useAddCompany(firmId: string) {
  const invalidate = useInvalidateCompany();
  return useMutation({
    mutationFn: (body: NewCompany) => api.post<CompanyRecord>(`/firms/${encodeURIComponent(firmId)}/companies`, body),
    onSuccess: invalidate,
  });
}

export function useSaveCompany(cid: string) {
  const invalidate = useInvalidateCompany();
  return useMutation({
    mutationFn: (body: CompanyRecord) => api.put<CompanyRecord>(company(cid), body),
    onSuccess: invalidate,
  });
}

export function useSaveComponent(cid: string) {
  const invalidate = useInvalidateCompany();
  return useMutation({
    mutationFn: (body: CustomComponent) =>
      api.put<CustomComponent>(`${company(cid)}/components/${encodeURIComponent(body.code)}`, body),
    onSuccess: invalidate,
  });
}

export function useSaveEmployee(cid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: EmployeeRecord) =>
      api.put<EmployeeRecord>(`${company(cid)}/employees/${encodeURIComponent(record.employee.employee_id)}`, record),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.employees(cid) }),
        qc.invalidateQueries({ queryKey: ["employee", cid] }),
        qc.invalidateQueries({ queryKey: ["changes", cid] }),
        qc.invalidateQueries({ queryKey: ["run", cid] }),
        qc.invalidateQueries({ queryKey: ["month", cid] }),
        qc.invalidateQueries({ queryKey: ["portfolio"] }),
      ]),
  });
}

export function useTermination(cid: string, eid: string) {
  return useMutation({
    mutationFn: (req: TerminationRequest) =>
      api.post<TerminationResult>(`${company(cid)}/employees/${encodeURIComponent(eid)}/termination`, req),
  });
}
