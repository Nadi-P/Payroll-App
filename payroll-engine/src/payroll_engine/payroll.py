"""A company payroll run: every employee's payslip for one month, plus the Form 102 totals."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from payroll_engine.annual import Form102, form102
from payroll_engine.dates import Period
from payroll_engine.models.inputs import PayslipInput
from payroll_engine.models.payslip import Flag, Payslip, Severity
from payroll_engine.pipeline import calculate
from payroll_engine.rules import RuleSet


@dataclass(frozen=True)
class PayrollRun:
    period: Period
    payslips: tuple[Payslip, ...]
    form102: Form102

    def flags(self, severity: Severity) -> tuple[tuple[str, Flag], ...]:
        """(employee_id, flag) pairs of one severity, e.g. the errors blocking approval."""
        return tuple(
            (p.employee_id, f) for p in self.payslips for f in p.flags if f.severity is severity
        )

    @property
    def can_approve(self) -> bool:
        return not self.flags(Severity.ERROR)


def run_payroll(
    inputs: Sequence[PayslipInput],
    rules: RuleSet,
    history: Mapping[str, Sequence[Payslip]] | None = None,
) -> PayrollRun:
    """Calculate all payslips of one month. `history` maps employee_id to earlier payslips."""
    if not inputs:
        raise ValueError("no employees in the payroll run")
    period = inputs[0].period
    if any(inp.period != period for inp in inputs):
        raise ValueError("a payroll run covers a single month")
    ids = [inp.employee.employee_id for inp in inputs]
    if len(set(ids)) != len(ids):
        raise ValueError("an employee appears twice in the payroll run")

    history = history or {}
    payslips = tuple(
        calculate(inp, rules, history.get(inp.employee.employee_id, ())) for inp in inputs
    )
    return PayrollRun(period, payslips, form102(payslips))
