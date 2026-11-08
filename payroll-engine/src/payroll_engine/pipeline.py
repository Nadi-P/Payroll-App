"""The payslip pipeline. Stages run in a fixed order; each reads only earlier results.

earnings -> allowances -> leave -> pension -> bases -> income tax -> national insurance
-> net pay -> employer cost -> validations
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import replace

from payroll_engine.calculators import (
    allowances,
    bases,
    earnings,
    income_tax,
    leave,
    national_insurance,
    net,
    pension,
)
from payroll_engine.components import Catalog
from payroll_engine.context import Context
from payroll_engine.models.inputs import PayslipInput
from payroll_engine.models.payslip import Payslip
from payroll_engine.models.trace import Trace
from payroll_engine.rules import RuleSet
from payroll_engine.validators import check


def calculate(inp: PayslipInput, rules: RuleSet, history: Sequence[Payslip] = ()) -> Payslip:
    """Calculate one payslip with the rules in force on the last day of the pay period.

    `history` (earlier payslips of the same employee) only feeds anomaly checks.
    """
    resolved = rules.at(inp.period.last_day)
    ctx = Context(inp, resolved, Catalog.from_rules(resolved).extended(inp.components))

    earnings.run(ctx)
    allowances.run(ctx)
    balances = leave.run(ctx)
    contributions, pension_base, study_base = pension.run(ctx)
    totals = bases.run(ctx, pension_base, study_base)
    tax = income_tax.run(ctx, totals, contributions)
    insurance = national_insurance.run(ctx, totals)
    deductions, net_pay = net.run(ctx, totals, tax, insurance, contributions)
    cost = net.employer_cost(ctx, totals, insurance, contributions)

    payslip = Payslip(
        employee_id=inp.employee.employee_id,
        period=inp.period,
        lines=tuple(ctx.lines),
        bases=totals,
        contributions=contributions,
        income_tax=tax,
        national_insurance=insurance,
        deductions=deductions,
        net_pay=net_pay,
        employer_cost=cost,
        balances=balances,
        flags=(),
        trace=Trace(tuple(ctx.trace)),
        ruleset_version=resolved.version,
        unverified_rules=resolved.unverified(),
    )
    return replace(payslip, flags=check(payslip, inp, resolved, history))
