"""Retroactive corrections: compare an issued payslip with its recalculation.

Recalculating a past period with `calculate` already uses that period's rules, so a correction
is just "recalculate with corrected inputs, then diff".
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from payroll_engine.models.payslip import Payslip


@dataclass(frozen=True)
class RetroDiff:
    lines: tuple[tuple[str, Decimal], ...]  # (code, new - old) for changed lines only
    gross_cash: Decimal
    income_tax: Decimal
    insurance_employee: Decimal
    insurance_employer: Decimal
    net_pay: Decimal
    employer_cost: Decimal


def diff(old: Payslip, new: Payslip) -> RetroDiff:
    if (old.employee_id, old.period) != (new.employee_id, new.period):
        raise ValueError("can only diff two versions of the same payslip")
    codes = sorted({line.code for line in old.lines} | {line.code for line in new.lines})
    changes = tuple((code, delta) for code in codes if (delta := new.line(code) - old.line(code)))
    return RetroDiff(
        lines=changes,
        gross_cash=new.bases.gross_cash - old.bases.gross_cash,
        income_tax=new.income_tax.tax - old.income_tax.tax,
        insurance_employee=(
            new.national_insurance.employee_total - old.national_insurance.employee_total
        ),
        insurance_employer=new.national_insurance.bl_employer - old.national_insurance.bl_employer,
        net_pay=new.net_pay - old.net_pay,
        employer_cost=new.employer_cost - old.employer_cost,
    )
