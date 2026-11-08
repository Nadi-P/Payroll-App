import type { Component, EmployeeRecord, MonthEntry, Payslip } from "@/api/types.generated";

/** What every section editor works on: a draft of the month's entry for one employee. */
export interface EditorProps {
  entry: MonthEntry;
  onChange: (entry: MonthEntry) => void;
  record: EmployeeRecord;
  catalog: Component[];
  nameOf: (code: string) => string;
  /** The payslip as calculated: balances, deposits and what the engine worked out itself. */
  slip?: Payslip;
  readOnly?: boolean;
}
