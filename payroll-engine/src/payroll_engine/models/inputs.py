"""Calculation inputs. Everything the engine needs arrives through PayslipInput."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from enum import StrEnum

from payroll_engine.components import CustomComponent
from payroll_engine.dates import Period
from payroll_engine.money import ZERO

_HOURS_PER_DAY = Decimal(24)
_CAR_TYPES = frozenset({"electric", "plug_in_hybrid", "hybrid"})


class InputError(ValueError):
    """Calculation input that can never be valid, rejected when the object is built."""


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise InputError(message)


def _non_negative(**values: Decimal | int | None) -> None:
    for name, value in values.items():
        _require(value is None or value >= 0, f"{name} cannot be negative")


class Gender(StrEnum):
    MALE = "male"
    FEMALE = "female"


class EmploymentKind(StrEnum):
    MONTHLY = "monthly"
    HOURLY = "hourly"


class TaxMethod(StrEnum):
    MONTHLY = "monthly"
    CUMULATIVE = "cumulative"


class Proration(StrEnum):
    CALENDAR_DAYS = "calendar_days"
    WORK_DAYS = "work_days"


class InsuranceCategory(StrEnum):
    STANDARD = "standard"
    UNDER_18 = "under_18"
    RETIREMENT_AGE = "retirement_age"


@dataclass(frozen=True)
class TaxBracket:
    """Monthly bracket: income up to `up_to` (None = unlimited) is taxed at `rate` percent."""

    up_to: Decimal | None
    rate: Decimal


@dataclass(frozen=True)
class Child:
    birth_date: date


@dataclass(frozen=True)
class CreditPointClaim:
    """Extra credit points declared on Form 101 (new immigrant, degree, discharged soldier...)."""

    code: str
    points: Decimal
    valid_from: date | None = None
    valid_to: date | None = None

    def applies(self, on: date) -> bool:
        return (self.valid_from is None or self.valid_from <= on) and (
            self.valid_to is None or on <= self.valid_to
        )


@dataclass(frozen=True)
class TaxCoordination:
    """Tax coordination certificate (Ishur Tium Mas): employer-specific brackets and points."""

    brackets: tuple[TaxBracket, ...]
    credit_points: Decimal = ZERO


@dataclass(frozen=True)
class TaxProfile:
    """Form 101 data."""

    resident: bool = True
    main_employer: bool = True
    children: tuple[Child, ...] = ()
    claims: tuple[CreditPointClaim, ...] = ()
    coordination: TaxCoordination | None = None
    fixed_rate: Decimal | None = None


@dataclass(frozen=True)
class PensionProfile:
    """Pension fund enrollment. Rates left as None fall back to the statutory minimum."""

    employee_rate: Decimal | None = None
    employer_rate: Decimal | None = None
    severance_rate: Decimal | None = None
    # Loss-of-work-capacity insurance (ovdan kosher) and other deposits (shonot), in percent of
    # the pension base. They are deposited with the fund but are not pension savings.
    disability_employee_rate: Decimal = ZERO
    disability_employer_rate: Decimal = ZERO
    other_employee_rate: Decimal = ZERO
    other_employer_rate: Decimal = ZERO

    def __post_init__(self) -> None:
        _non_negative(
            employee_rate=self.employee_rate,
            employer_rate=self.employer_rate,
            severance_rate=self.severance_rate,
            disability_employee_rate=self.disability_employee_rate,
            disability_employer_rate=self.disability_employer_rate,
            other_employee_rate=self.other_employee_rate,
            other_employer_rate=self.other_employer_rate,
        )


@dataclass(frozen=True)
class StudyFundProfile:
    employee_rate: Decimal
    employer_rate: Decimal

    def __post_init__(self) -> None:
        _non_negative(employee_rate=self.employee_rate, employer_rate=self.employer_rate)


@dataclass(frozen=True)
class Employee:
    """`monthly_salary` is the actual salary for the employee's position (already reflecting
    `job_fraction`); `job_fraction` drives accruals and the minimum-wage check."""

    employee_id: str
    birth_date: date
    gender: Gender
    start_date: date
    kind: EmploymentKind
    monthly_salary: Decimal | None = None
    hourly_rate: Decimal | None = None
    end_date: date | None = None
    work_week: int = 5
    job_fraction: Decimal = Decimal(1)
    tax: TaxProfile = field(default_factory=TaxProfile)
    pension: PensionProfile | None = None
    study_fund: StudyFundProfile | None = None
    insurance_category: InsuranceCategory | None = None
    had_prior_pension: bool = False
    holiday_calendar: str = "jewish"  # which holiday list in `calendar.holidays` applies

    def __post_init__(self) -> None:
        _require(bool(self.employee_id.strip()), "employee_id is required")
        _require(bool(self.holiday_calendar.strip()), "holiday_calendar is required")
        _require(self.work_week in (5, 6), "work_week must be 5 or 6")
        _require(0 < self.job_fraction <= 1, "job_fraction must be above 0 and at most 1")
        _require(self.birth_date < self.start_date, "birth_date must be before start_date")
        _require(
            self.end_date is None or self.end_date >= self.start_date,
            "end_date cannot be before start_date",
        )
        if self.kind is EmploymentKind.MONTHLY:
            _require(self.monthly_salary is not None, "monthly employees need monthly_salary")
        else:
            _require(self.hourly_rate is not None, "hourly employees need hourly_rate")
        _non_negative(monthly_salary=self.monthly_salary, hourly_rate=self.hourly_rate)


@dataclass(frozen=True)
class EmployerSettings:
    proration: Proration = Proration.WORK_DAYS
    tax_method: TaxMethod = TaxMethod.MONTHLY
    recuperation_month: int | None = None  # None = paid monthly as 1/12

    def __post_init__(self) -> None:
        _require(
            self.recuperation_month is None or 1 <= self.recuperation_month <= 12,
            "recuperation_month must be 1-12",
        )


@dataclass(frozen=True)
class PayLine:
    """A pay component entered directly (bonus, commission, meal benefit...)."""

    code: str
    amount: Decimal
    quantity: Decimal | None = None
    rate: Decimal | None = None


@dataclass(frozen=True)
class WorkDay:
    day: date
    hours: Decimal
    rest_day: bool = False
    night: bool = False

    def __post_init__(self) -> None:
        _require(0 <= self.hours <= _HOURS_PER_DAY, f"hours on {self.day} must be 0-24")


@dataclass(frozen=True)
class SickDay:
    day: date
    day_of_episode: int

    def __post_init__(self) -> None:
        _require(self.day_of_episode >= 1, "day_of_episode starts at 1")


@dataclass(frozen=True)
class LeaveInputs:
    vacation_opening: Decimal = ZERO
    vacation_days_used: Decimal = ZERO
    sick_opening: Decimal = ZERO
    sick_days: tuple[SickDay, ...] = ()
    holiday_days: int | None = None  # None = count paid holidays from the calendar
    reserve_days: int = 0
    unpaid_absence_days: Decimal = ZERO
    prior_three_months_gross: Decimal | None = None
    daily_wage: Decimal | None = None  # overrides the computed daily wage for leave pay
    # One-time balance loads (kelita chad-pa'amit): corrections entered this month, + or -.
    vacation_adjustment: Decimal = ZERO
    sick_adjustment: Decimal = ZERO
    recuperation_opening: Decimal = ZERO  # recuperation days owed at the start of the month
    recuperation_adjustment: Decimal = ZERO

    def __post_init__(self) -> None:
        _non_negative(
            vacation_days_used=self.vacation_days_used,
            sick_opening=self.sick_opening,
            holiday_days=self.holiday_days,
            reserve_days=self.reserve_days,
            unpaid_absence_days=self.unpaid_absence_days,
            prior_three_months_gross=self.prior_three_months_gross,
            daily_wage=self.daily_wage,
        )
        _require(
            len({s.day for s in self.sick_days}) == len(self.sick_days),
            "sick_days has a date twice",
        )


@dataclass(frozen=True)
class Allowances:
    travel_daily_cost: Decimal | None = None
    attendance_days: int | None = None  # None = scheduled work days of the period
    car_list_price: Decimal | None = None
    car_type: str | None = None  # None, "electric", "plug_in_hybrid", "hybrid"
    mobile_phone: bool = False

    def __post_init__(self) -> None:
        _non_negative(
            travel_daily_cost=self.travel_daily_cost,
            attendance_days=self.attendance_days,
            car_list_price=self.car_list_price,
        )
        _require(
            self.car_type is None or self.car_type in _CAR_TYPES,
            f"car_type must be one of {sorted(_CAR_TYPES)}",
        )


@dataclass(frozen=True)
class Deduction:
    """A net-pay deduction. Lower priority numbers are taken first."""

    code: str
    amount: Decimal
    priority: int = 100

    def __post_init__(self) -> None:
        _non_negative(amount=self.amount)


@dataclass(frozen=True)
class YearToDate:
    """Totals from earlier months of the same tax year at this employer (cumulative method)."""

    months: int = 0
    taxable_income: Decimal = ZERO
    tax_withheld: Decimal = ZERO
    credits: Decimal = ZERO

    def __post_init__(self) -> None:
        _require(0 <= self.months <= 11, "ytd.months counts earlier months: 0-11")


@dataclass(frozen=True)
class PayslipInput:
    employee: Employee
    period: Period
    settings: EmployerSettings = field(default_factory=EmployerSettings)
    lines: tuple[PayLine, ...] = ()
    timesheet: tuple[WorkDay, ...] = ()
    leave: LeaveInputs = field(default_factory=LeaveInputs)
    allowances: Allowances = field(default_factory=Allowances)
    deductions: tuple[Deduction, ...] = ()
    ytd: YearToDate = field(default_factory=YearToDate)
    components: tuple[CustomComponent, ...] = ()  # the employer's own pay components

    def __post_init__(self) -> None:
        emp, month = self.employee, f"{self.period.year}-{self.period.month:02}"
        _require(
            emp.start_date <= self.period.last_day
            and (emp.end_date is None or emp.end_date >= self.period.first_day),
            f"employee {emp.employee_id} is not employed in {month}",
        )
        _require(self.ytd.months < self.period.month, "ytd.months must be before this month")
