"""Working state for one payslip calculation. Lives only inside the pipeline."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from payroll_engine.components import Catalog, Component
from payroll_engine.dates import Period, count_work_days
from payroll_engine.models.inputs import Employee, PayslipInput, Proration
from payroll_engine.models.payslip import PayslipLine
from payroll_engine.models.trace import TraceEntry
from payroll_engine.money import ZERO, round_agorot
from payroll_engine.rules import ResolvedRules, RuleError

HOLIDAYS_RULE = "calendar.holidays"


@dataclass
class Context:
    inp: PayslipInput
    rules: ResolvedRules
    catalog: Catalog
    lines: list[PayslipLine] = field(default_factory=list)
    trace: list[TraceEntry] = field(default_factory=list)
    holidays: frozenset[date] = field(init=False)

    def __post_init__(self) -> None:
        # Loaded eagerly so an unknown calendar fails every payslip, not only the ones using it.
        self.holidays = _holidays(self.rules, self.inp.employee.holiday_calendar)

    @property
    def employee(self) -> Employee:
        return self.inp.employee

    @property
    def period(self) -> Period:
        return self.inp.period

    def work_days(self) -> int:
        """Scheduled working days of the pay month for this employee, holidays excluded."""
        return self.period.work_days(self.employee.work_week, self.holidays)

    def add_line(
        self,
        code: str,
        amount: Decimal,
        *,
        quantity: Decimal | None = None,
        rate: Decimal | None = None,
        formula: str = "input",
        **inputs: object,
    ) -> Decimal:
        """Round, record and explain a pay line. Zero amounts are skipped."""
        component = self.catalog.get(code)
        amount = round_agorot(amount)
        if amount == ZERO:
            return ZERO
        self.lines.append(
            PayslipLine(
                code, component.name_he, component.name_en, component.kind, amount, quantity, rate
            )
        )
        self.explain(f"line.{code}", component.name_en, formula, amount, **inputs)
        return amount

    def explain(
        self, rule_id: str, description: str, formula: str, result: Decimal, **inputs: object
    ) -> None:
        self.trace.append(
            TraceEntry(
                rule_id,
                description,
                formula,
                tuple((k, str(v)) for k, v in inputs.items()),
                result,
                self.rules.version,
            )
        )

    def total(self, include: Callable[[Component], bool]) -> Decimal:
        return sum(
            (line.amount for line in self.lines if include(self.catalog.get(line.code))), ZERO
        )

    def employed_fraction(self) -> Decimal:
        """Share of the period the employee was employed, by the employer's proration policy."""
        emp, period = self.employee, self.period
        start = max(period.first_day, emp.start_date)
        end = min(period.last_day, emp.end_date or period.last_day)
        if end < start:
            return ZERO
        if start == period.first_day and end == period.last_day:
            return Decimal(1)
        if self.inp.settings.proration is Proration.CALENDAR_DAYS:
            return Decimal((end - start).days + 1) / Decimal(period.calendar_days)
        employed = count_work_days(start, end, emp.work_week, self.holidays)
        return Decimal(employed) / Decimal(self.work_days())


def _holidays(rules: ResolvedRules, calendar_name: str) -> frozenset[date]:
    """Paid rest days of the pay year: the general list plus the employee calendar."""
    calendars = rules.value(HOLIDAYS_RULE)
    if calendar_name not in calendars:
        raise RuleError(f"no holiday calendar '{calendar_name}' for {rules.on.year}")
    days = [*calendars.get("general", []), *calendars[calendar_name]]
    return frozenset(date.fromisoformat(h["date"]) for h in days)
