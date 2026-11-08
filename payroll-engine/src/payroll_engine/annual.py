"""Annual and periodic reporting data: Form 106 per employee, Form 126 per employer,
Form 102 per month, and the year-end income tax reconciliation."""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from payroll_engine.calculators.income_tax import bracket_tax, brackets, surtax
from payroll_engine.models.payslip import Payslip
from payroll_engine.money import ZERO, round_agorot
from payroll_engine.rules import RuleSet


@dataclass(frozen=True)
class AnnualSummary:
    """Form 106 data for one employee and tax year."""

    employee_id: str
    year: int
    months: int
    gross_cash: Decimal
    benefits: Decimal
    taxable: Decimal
    tax_withheld: Decimal
    bl_employee: Decimal
    health_employee: Decimal
    bl_employer: Decimal
    pension_employee: Decimal
    pension_employer: Decimal
    severance_employer: Decimal
    study_fund_employee: Decimal
    study_fund_employer: Decimal
    credit_points_amount: Decimal
    pension_credit: Decimal


@dataclass(frozen=True)
class AnnualReconciliation:
    summary: AnnualSummary
    tax_due: Decimal
    difference: Decimal  # positive: employee owes; negative: refund due


@dataclass(frozen=True)
class Form102:
    """Monthly employer report to the Tax Authority and National Insurance."""

    year: int
    month: int
    employees: int
    gross_total: Decimal
    insurable_total: Decimal
    tax_withheld: Decimal
    bl_employee: Decimal
    health_employee: Decimal
    bl_employer: Decimal

    @property
    def insurance_total(self) -> Decimal:
        return self.bl_employee + self.health_employee + self.bl_employer


def _sum(payslips: Iterable[Payslip], get: Callable[[Payslip], Decimal]) -> Decimal:
    return sum((get(p) for p in payslips), ZERO)


def annual_summary(payslips: Sequence[Payslip]) -> AnnualSummary:
    if not payslips:
        raise ValueError("no payslips")
    employee_id, year = payslips[0].employee_id, payslips[0].period.year
    months = [p.period.month for p in payslips]
    if any(p.employee_id != employee_id or p.period.year != year for p in payslips):
        raise ValueError("payslips must belong to one employee and one tax year")
    if len(set(months)) != len(months):
        raise ValueError("duplicate months; pass only the final payslip of each month")

    return AnnualSummary(
        employee_id=employee_id,
        year=year,
        months=len(payslips),
        gross_cash=_sum(payslips, lambda p: p.bases.gross_cash),
        benefits=_sum(payslips, lambda p: p.bases.benefits),
        taxable=_sum(payslips, lambda p: p.bases.taxable),
        tax_withheld=_sum(payslips, lambda p: p.income_tax.tax),
        bl_employee=_sum(payslips, lambda p: p.national_insurance.bl_employee),
        health_employee=_sum(payslips, lambda p: p.national_insurance.health_employee),
        bl_employer=_sum(payslips, lambda p: p.national_insurance.bl_employer),
        pension_employee=_sum(payslips, lambda p: p.contributions.pension_employee),
        pension_employer=_sum(payslips, lambda p: p.contributions.pension_employer),
        severance_employer=_sum(payslips, lambda p: p.contributions.severance_employer),
        study_fund_employee=_sum(payslips, lambda p: p.contributions.study_fund_employee),
        study_fund_employer=_sum(payslips, lambda p: p.contributions.study_fund_employer),
        credit_points_amount=_sum(payslips, lambda p: p.income_tax.credit_points_amount),
        pension_credit=_sum(payslips, lambda p: p.income_tax.pension_credit),
    )


def reconcile_year(
    payslips: Sequence[Payslip], rules: RuleSet, months: int = 12
) -> AnnualReconciliation:
    """Recompute the year's tax on total income with brackets scaled to `months` (12 for the
    full year, as in force on 31 December) and the credits actually granted, and compare with
    tax withheld. Pass the months elapsed so far for a year-to-date check of a year in progress;
    full annual brackets on a partial year would overstate the refund."""
    if not 1 <= months <= 12:
        raise ValueError("months must be 1-12")
    summary = annual_summary(payslips)
    resolved = rules.at(
        date(summary.year, 12, 31) if months == 12 else date(summary.year, months, 28)
    )
    gross = bracket_tax(summary.taxable, brackets(resolved), months) + surtax(
        summary.taxable, resolved, months
    )
    credits = summary.credit_points_amount + summary.pension_credit
    tax_due = round_agorot(max(gross - credits, ZERO))
    return AnnualReconciliation(summary, tax_due, tax_due - summary.tax_withheld)


def form126(payslips_by_employee: Mapping[str, Sequence[Payslip]]) -> tuple[AnnualSummary, ...]:
    """Form 126: the employer's annual report, one Form 106 summary per employee."""
    return tuple(annual_summary(slips) for _, slips in sorted(payslips_by_employee.items()))


def form102(payslips: Sequence[Payslip]) -> Form102:
    if not payslips:
        raise ValueError("no payslips")
    period = payslips[0].period
    if any(p.period != period for p in payslips):
        raise ValueError("Form 102 covers a single month")
    return Form102(
        year=period.year,
        month=period.month,
        employees=len({p.employee_id for p in payslips}),
        gross_total=_sum(payslips, lambda p: p.bases.gross_cash),
        insurable_total=_sum(payslips, lambda p: p.national_insurance.insurable),
        tax_withheld=_sum(payslips, lambda p: p.income_tax.tax),
        bl_employee=_sum(payslips, lambda p: p.national_insurance.bl_employee),
        health_employee=_sum(payslips, lambda p: p.national_insurance.health_employee),
        bl_employer=_sum(payslips, lambda p: p.national_insurance.bl_employer),
    )
