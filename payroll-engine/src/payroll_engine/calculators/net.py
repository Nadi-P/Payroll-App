"""Stage 8: net pay and employer cost.

Statutory amounts come off first. Other deductions are then taken in priority order while net
pay stays non-negative; whatever does not fit is reported as unapplied (carried forward).
"""

from __future__ import annotations

from decimal import Decimal

from payroll_engine.components import ComponentKind
from payroll_engine.context import Context
from payroll_engine.models.payslip import (
    AppliedDeduction,
    Bases,
    Contributions,
    IncomeTax,
    NationalInsurance,
)
from payroll_engine.money import ZERO, round_agorot


def run(
    ctx: Context,
    bases: Bases,
    tax: IncomeTax,
    insurance: NationalInsurance,
    contributions: Contributions,
) -> tuple[tuple[AppliedDeduction, ...], Decimal]:
    available = bases.gross_cash - tax.tax - insurance.employee_total - contributions.employee_total
    applied: list[AppliedDeduction] = []
    for deduction in sorted(ctx.inp.deductions, key=lambda d: d.priority):
        if ctx.catalog.get(deduction.code).kind is not ComponentKind.DEDUCTION:
            raise ValueError(f"{deduction.code} is not a deduction component")
        requested = round_agorot(deduction.amount)
        taken = min(requested, max(available, ZERO))
        available -= taken
        applied.append(AppliedDeduction(deduction.code, requested, taken))

    net = round_agorot(available)
    ctx.explain(
        "net.pay",
        "Net pay",
        "gross_cash - income_tax - insurance - employee_contributions - deductions",
        net,
        gross_cash=bases.gross_cash,
        income_tax=tax.tax,
        insurance=insurance.employee_total,
        employee_contributions=contributions.employee_total,
    )
    return tuple(applied), net


def employer_cost(
    ctx: Context, bases: Bases, insurance: NationalInsurance, contributions: Contributions
) -> Decimal:
    cost = bases.gross_cash + insurance.bl_employer + contributions.employer_total
    ctx.explain(
        "net.employer_cost",
        "Employer cost",
        "gross_cash + employer_insurance + employer_contributions",
        cost,
        gross_cash=bases.gross_cash,
        employer_insurance=insurance.bl_employer,
        employer_contributions=contributions.employer_total,
    )
    return cost
