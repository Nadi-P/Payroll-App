"""API-level records and responses. Engine types are reused wherever possible."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from enum import StrEnum

from payroll_engine.annual import AnnualReconciliation, Form102
from payroll_engine.components import CustomComponent
from payroll_engine.dates import Period
from payroll_engine.models import (
    Allowances,
    Deduction,
    Employee,
    EmployerSettings,
    LeaveInputs,
    PayLine,
    Payslip,
    WorkDay,
)
from payroll_engine.retro import RetroDiff
from payroll_engine.termination import ServicePeriod


class MonthStatus(StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"


class Plan(StrEnum):
    """Subscription: a single company, or an accounting firm managing many."""

    SINGLE = "single"
    MULTI = "multi"


class MaritalStatus(StrEnum):
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"
    SEPARATED = "separated"


class HealthFund(StrEnum):
    NONE = "none"
    CLALIT = "clalit"
    MACCABI = "maccabi"
    MEUHEDET = "meuhedet"
    LEUMIT = "leumit"


class IncomeType(StrEnum):
    """Form 101 part D: the kind of income from this employer."""

    MONTHLY = "monthly"
    ADDITIONAL = "additional"
    PARTIAL = "partial"
    DAILY = "daily"
    PENSION = "pension"
    STIPEND = "stipend"


class SpouseIncome(StrEnum):
    NONE = "none"
    WORK = "work"
    OTHER = "other"


class Role(StrEnum):
    """What a firm user may do. Admins and leads see and edit every client and assign them;
    accountants edit clients assigned to them or to nobody; viewers only read."""

    ADMIN = "admin"
    LEAD = "lead"
    ACCOUNTANT = "accountant"
    VIEWER = "viewer"


class FundKind(StrEnum):
    PENSION = "pension"
    MANAGERS_INSURANCE = "managers_insurance"
    PROVIDENT = "provident"
    STUDY_FUND = "study_fund"


@dataclass(frozen=True)
class User:
    id: str
    firm_id: str
    name: str
    email: str
    role: Role = Role.ACCOUNTANT


@dataclass(frozen=True)
class Firm:
    id: str
    name: str
    plan: Plan = Plan.MULTI


@dataclass(frozen=True)
class Company:
    id: str
    firm_id: str
    name: str
    deductions_file: str  # tik nikuyim
    settings: EmployerSettings = field(default_factory=EmployerSettings)
    components: tuple[CustomComponent, ...] = ()  # the company's own pay components
    assignees: tuple[str, ...] = ()  # user ids; empty = a free client anyone may handle


@dataclass(frozen=True)
class Address:
    street: str = ""
    house_number: str = ""
    city: str = ""
    zip_code: str = ""


@dataclass(frozen=True)
class Spouse:
    """Form 101 part F."""

    first_name: str = ""
    last_name: str = ""
    national_id: str = ""
    birth_date: date | None = None
    immigration_date: date | None = None
    income: SpouseIncome = SpouseIncome.NONE


@dataclass(frozen=True)
class Profile:
    """Personal details (Form 101 parts B, D and F). Tax credit data lives on the employee."""

    first_name: str
    last_name: str
    national_id: str
    department: str = ""
    sub_department: str = ""
    position: str = ""
    email: str = ""
    phone: str = ""
    mobile: str = ""
    address: Address = field(default_factory=Address)
    marital_status: MaritalStatus = MaritalStatus.SINGLE
    kibbutz_member: bool = False
    health_fund: HealthFund = HealthFund.NONE
    spouse: Spouse | None = None
    income_type: IncomeType = IncomeType.MONTHLY
    immigration_date: date | None = None  # credit points: shown with the tax data
    other_income: tuple[IncomeType, ...] = ()  # Form 101 part E


@dataclass(frozen=True)
class StandingLine:
    """A component paid or deducted every month until further notice (car, loan, allowance)."""

    code: str
    amount: Decimal
    valid_from: date | None = None
    valid_to: date | None = None

    def applies(self, period: Period) -> bool:
        return (self.valid_from is None or self.valid_from <= period.last_day) and (
            self.valid_to is None or self.valid_to >= period.first_day
        )


@dataclass(frozen=True)
class FundEnrollment:
    """One provident fund the employee deposits to. Rates are percent of the fund's salary:
    the pension (or study fund) base times `salary_share` percent. Pension-type rates left as
    None use the statutory minimum."""

    code: str
    name: str
    kind: FundKind
    member_number: str = ""
    branch: str = ""
    group: str = ""
    amounts_ref: str = ""  # Shiklulit column "ע. ע. סכומים"; meaning still to be confirmed
    salary_share: Decimal = Decimal(100)
    employee_rate: Decimal | None = None
    employer_rate: Decimal | None = None
    severance_rate: Decimal | None = None
    disability_employee_rate: Decimal = Decimal(0)
    disability_employer_rate: Decimal = Decimal(0)
    other_employee_rate: Decimal = Decimal(0)
    other_employer_rate: Decimal = Decimal(0)


@dataclass(frozen=True)
class EmployeeRecord:
    company_id: str
    profile: Profile
    employee: Employee
    standing: tuple[StandingLine, ...] = ()
    funds: tuple[FundEnrollment, ...] = ()


@dataclass(frozen=True)
class TermChange:
    """One change to an employee's employment terms, kept for the profile's history."""

    id: str
    company_id: str
    employee_id: str
    at: str  # ISO date and time, UTC
    field: str  # e.g. "monthly_salary", "standing:CAR_BENEFIT", "fund:MIG-1"
    change: str  # "added", "changed" or "removed"
    old: str = ""
    new: str = ""
    user_id: str = ""
    user_name: str = ""


@dataclass(frozen=True)
class MonthEntry:
    """What changes month to month for one employee; everything else comes from the record."""

    lines: tuple[PayLine, ...] = ()
    timesheet: tuple[WorkDay, ...] = ()
    leave: LeaveInputs = field(default_factory=LeaveInputs)
    allowances: Allowances = field(default_factory=Allowances)
    deductions: tuple[Deduction, ...] = ()
    hours_total: Decimal | None = None  # spread over the month's work days when no timesheet
    sick_days_count: int | None = None  # placed on the month's first work days when no dates


@dataclass(frozen=True)
class EmployeeEntry:
    employee_id: str
    entry: MonthEntry


@dataclass(frozen=True)
class MonthRecord:
    company_id: str
    period: Period
    status: MonthStatus = MonthStatus.DRAFT
    entries: tuple[EmployeeEntry, ...] = ()
    approved: tuple[Payslip, ...] = ()  # payslips as approved (the official record)
    produced: tuple[str, ...] = ()  # employee ids whose payslip was produced
    sent: tuple[str, ...] = ()  # employee ids whose payslip was sent to them
    previous: tuple[Payslip, ...] = ()  # last approved version while reopened for corrections


@dataclass(frozen=True)
class StoreData:
    firms: tuple[Firm, ...] = ()
    companies: tuple[Company, ...] = ()
    employees: tuple[EmployeeRecord, ...] = ()
    months: tuple[MonthRecord, ...] = ()
    users: tuple[User, ...] = ()
    term_changes: tuple[TermChange, ...] = ()


@dataclass(frozen=True)
class EntryBatch:
    """Several employees' entries saved in one go (a paste, or one change for many)."""

    entries: tuple[EmployeeEntry, ...]


@dataclass(frozen=True)
class NewCompany:
    name: str
    deductions_file: str
    settings: EmployerSettings = field(default_factory=EmployerSettings)


@dataclass(frozen=True)
class Assignees:
    assignees: tuple[str, ...]


@dataclass(frozen=True)
class PreviewRequest:
    """Unsaved changes to try on one employee's month: their record, their entry, or both."""

    record: EmployeeRecord | None = None
    entry: MonthEntry | None = None


# ---- responses -----------------------------------------------------------------------------


@dataclass(frozen=True)
class OpenMonths:
    """The month being worked on now, and earlier months still open."""

    current: Period
    open: tuple[Period, ...]  # every open month, oldest first, the current one included


@dataclass(frozen=True)
class MonthPreview:
    before: Payslip | None
    after: Payslip


@dataclass(frozen=True)
class MonthInfo:
    period: Period
    status: MonthStatus


@dataclass(frozen=True)
class Production:
    """Payslip production for a month: how many are due, made and sent."""

    expected: int
    produced: int
    sent: int
    produced_ids: tuple[str, ...]
    sent_ids: tuple[str, ...]


@dataclass(frozen=True)
class CompanySummary:
    company: Company
    employees: int
    period: Period
    status: MonthStatus
    errors: int
    warnings: int
    infos: int
    production: Production
    net_total: Decimal
    employer_cost_total: Decimal
    gross_total: Decimal
    tax_total: Decimal
    insurance_total: Decimal  # national + health insurance, employee and employer
    pension_total: Decimal  # pension and severance, employee and employer


@dataclass(frozen=True)
class PortfolioRow:
    """One client in the portfolio, at its own current month."""

    summary: CompanySummary
    open_earlier: tuple[Period, ...]  # open months before the current one


@dataclass(frozen=True)
class MonthView:
    company_id: str
    period: Period
    status: MonthStatus
    employees: tuple[EmployeeRecord, ...]
    entries: tuple[EmployeeEntry, ...]


@dataclass(frozen=True)
class RunResult:
    period: Period
    status: MonthStatus
    can_approve: bool  # no errors and every payslip produced and sent
    can_produce: bool  # no errors
    production: Production
    payslips: tuple[Payslip, ...]
    form102: Form102


@dataclass(frozen=True)
class EmployeeDiff:
    employee_id: str
    diff: RetroDiff


@dataclass(frozen=True)
class CorrectionDiff:
    period: Period
    items: tuple[EmployeeDiff, ...]


@dataclass(frozen=True)
class AnnualResult:
    year: int
    months_covered: int  # 12 = full year; fewer = year to date
    items: tuple[AnnualReconciliation, ...]


@dataclass(frozen=True)
class TerminationRequest:
    """TerminationInput without the employee, who is taken from the store."""

    termination_date: date
    last_salary: Decimal | None = None  # None = severance base of the latest payslip
    service_periods: tuple[ServicePeriod, ...] = ()
    severance_fund_balance: Decimal = Decimal(0)
    entitled_to_severance: bool = True
    notice_days_given: Decimal = Decimal(0)
    notice_required: bool = True
    vacation_balance: Decimal = Decimal(0)
    unpaid_recuperation_days: Decimal = Decimal(0)


@dataclass(frozen=True)
class Holiday:
    date: date
    calendar: str
    name_he: str
    name_en: str


@dataclass(frozen=True)
class CoverageGap:
    period: Period
    rule_id: str


@dataclass(frozen=True)
class RulesMeta:
    version: str
    unverified: tuple[str, ...]


@dataclass(frozen=True)
class EmployeeHours:
    employee_id: str
    hours: Decimal


@dataclass(frozen=True)
class YearMonth:
    """One month of a tax year. Payslips carry no trace, to keep the year light."""

    period: Period
    status: MonthStatus
    payslips: tuple[Payslip, ...]
    hours: tuple[EmployeeHours, ...]


@dataclass(frozen=True)
class YearData:
    year: int
    months: tuple[YearMonth, ...]


@dataclass(frozen=True)
class Liability:
    """What the employer would owe if the employee left at the end of the month."""

    employee_id: str
    vacation_days: Decimal
    vacation_value: Decimal
    severance_entitlement: Decimal
    severance_funded: Decimal  # funds accumulated in the months held in this system
    severance_shortfall: Decimal
