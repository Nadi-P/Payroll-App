"""Stage 5: sum the pay lines into the bases that taxes and contributions apply to."""

from __future__ import annotations

from decimal import Decimal

from payroll_engine.components import ComponentKind
from payroll_engine.context import Context
from payroll_engine.models.payslip import Bases


def run(ctx: Context, pension_base: Decimal, study_fund_base: Decimal) -> Bases:
    return Bases(
        gross_cash=ctx.total(lambda c: c.kind is ComponentKind.EARNING),
        benefits=ctx.total(lambda c: c.kind is ComponentKind.BENEFIT),
        taxable=ctx.total(lambda c: c.taxable),
        insurable=ctx.total(lambda c: c.insurable),
        pension=pension_base,
        study_fund=study_fund_base,
        severance=ctx.total(lambda c: c.severance_base),
    )
