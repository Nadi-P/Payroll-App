"""Calculation outputs."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum

from payroll_engine.components import ComponentKind
from payroll_engine.dates import Period
from payroll_engine.models.inputs import InsuranceCategory
from payroll_engine.models.trace import Trace
from payroll_engine.money import ZERO


class Severity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass(frozen=True)
class Flag:
    code: str
    severity: Severity
    message: str


@dataclass(frozen=True)
class PayslipLine:
    code: str
    name_he: str
    name_en: str
    kind: ComponentKind
    amount: Decimal
    quantity: Decimal | None = None
    rate: Decimal | None = None


@dataclass(frozen=True)
class Bases:
    gross_cash: Decimal  # everything actually paid before deductions
    benefits: Decimal  # non-cash taxable value
    taxable: Decimal
    insurable: Decimal
    pension: Decimal
    study_fund: Decimal
    severance: Decimal  # salary for severance purposes (feeds the termination settlement)


@dataclass(frozen=True)
class Contributions:
    pension_employee: Decimal = ZERO
    pension_employer: Decimal = ZERO
    severance_employer: Decimal = ZERO
    study_fund_employee: Decimal = ZERO
    study_fund_employer: Decimal = ZERO
    disability_employee: Decimal = ZERO
    disability_employer: Decimal = ZERO
    other_employee: Decimal = ZERO
    other_employer: Decimal = ZERO

    @property
    def employee_total(self) -> Decimal:
        return (
            self.pension_employee
            + self.study_fund_employee
            + self.disability_employee
            + self.other_employee
        )

    @property
    def employer_total(self) -> Decimal:
        return (
            self.pension_employer
            + self.severance_employer
            + self.study_fund_employer
            + self.disability_employer
            + self.other_employer
        )


@dataclass(frozen=True)
class IncomeTax:
    taxable: Decimal
    bracket_tax: Decimal
    surtax: Decimal
    credit_points: Decimal
    credit_points_amount: Decimal
    pension_credit: Decimal
    tax: Decimal  # negative only under the cumulative method (refund)


@dataclass(frozen=True)
class NationalInsurance:
    category: InsuranceCategory
    insurable: Decimal
    bl_employee: Decimal
    health_employee: Decimal
    bl_employer: Decimal

    @property
    def employee_total(self) -> Decimal:
        return self.bl_employee + self.health_employee


@dataclass(frozen=True)
class AppliedDeduction:
    code: str
    requested: Decimal
    applied: Decimal

    @property
    def unapplied(self) -> Decimal:
        return self.requested - self.applied


@dataclass(frozen=True)
class Balances:
    """Leave in days. For each kind: opening (start of month) + adjustment (one-time load)
    + accrued - used = closing balance."""

    vacation: Decimal = ZERO
    vacation_accrued: Decimal = ZERO
    sick: Decimal = ZERO
    sick_accrued: Decimal = ZERO
    reserve_duty_reimbursement: Decimal = ZERO
    vacation_opening: Decimal = ZERO
    vacation_adjustment: Decimal = ZERO
    vacation_used: Decimal = ZERO
    sick_opening: Decimal = ZERO
    sick_adjustment: Decimal = ZERO
    sick_used: Decimal = ZERO
    recuperation: Decimal = ZERO
    recuperation_opening: Decimal = ZERO
    recuperation_adjustment: Decimal = ZERO
    recuperation_accrued: Decimal = ZERO
    recuperation_used: Decimal = ZERO
    reserve_days: Decimal = ZERO


@dataclass(frozen=True)
class Payslip:
    employee_id: str
    period: Period
    lines: tuple[PayslipLine, ...]
    bases: Bases
    contributions: Contributions
    income_tax: IncomeTax
    national_insurance: NationalInsurance
    deductions: tuple[AppliedDeduction, ...]
    net_pay: Decimal
    employer_cost: Decimal
    balances: Balances
    flags: tuple[Flag, ...]
    trace: Trace
    ruleset_version: str
    unverified_rules: tuple[str, ...]

    def line(self, code: str) -> Decimal:
        """Total amount of all lines with this component code."""
        return sum((x.amount for x in self.lines if x.code == code), ZERO)
