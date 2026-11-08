import type { Employee, EmployeeRecord, FundEnrollment, Profile, StandingLine } from "@/api/types.generated";

/** What every terms editor works on: a draft of the employee's record. */
export interface TermsProps {
  record: EmployeeRecord;
  onChange: (record: EmployeeRecord) => void;
  readOnly?: boolean;
}

export const withEmployee = (r: EmployeeRecord, patch: Partial<Employee>): EmployeeRecord => ({
  ...r,
  employee: { ...r.employee, ...patch },
});

export const withProfile = (r: EmployeeRecord, patch: Partial<Profile>): EmployeeRecord => ({
  ...r,
  profile: { ...r.profile, ...patch },
});

export const withStanding = (r: EmployeeRecord, standing: StandingLine[]): EmployeeRecord => ({ ...r, standing });

export const withFunds = (r: EmployeeRecord, funds: FundEnrollment[]): EmployeeRecord => ({ ...r, funds });

/** The rate fields of a fund, in the order they are shown. Pension-type rates may stay empty (statutory). */
export const FUND_RATES = [
  "employee_rate",
  "employer_rate",
  "severance_rate",
  "disability_employee_rate",
  "disability_employer_rate",
  "other_employee_rate",
  "other_employer_rate",
] as const;
export type FundRate = (typeof FUND_RATES)[number];

export const FUND_KINDS = ["pension", "managers_insurance", "provident", "study_fund"] as const;

/** A new enrollment: a pension fund on the whole salary at the statutory rates. */
export const newFund = (n: number): FundEnrollment => ({
  code: `NEW-${n}`,
  name: "",
  kind: "pension",
  salary_share: "100",
});

export const sameRecord = (a: EmployeeRecord | null | undefined, b: EmployeeRecord | null | undefined) =>
  JSON.stringify(a) === JSON.stringify(b);
