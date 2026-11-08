"""Final settlement on termination: severance (with Section 14), its tax exemption, notice pay,
vacation and recuperation payout. Produces the data needed for Form 161."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from payroll_engine.dates import add_months, service_months
from payroll_engine.models.inputs import Employee, EmploymentKind
from payroll_engine.models.trace import Trace, TraceEntry
from payroll_engine.money import ZERO, D, round_agorot
from payroll_engine.rules import ResolvedRules, RuleSet

SEVERANCE_RULE = "termination.severance"
NOTICE_RULE = "termination.notice"
VACATION_RULE = "labor.vacation"
RECUPERATION_RULE = "labor.recuperation"
DAYS_PER_YEAR = Decimal(365)


@dataclass(frozen=True)
class ServicePeriod:
    """A stretch of service. `section14_rate` is the employer severance deposit rate under a
    Section 14 arrangement, or None when no arrangement applied."""

    start: date
    end: date
    section14_rate: Decimal | None = None


@dataclass(frozen=True)
class TerminationInput:
    employee: Employee
    termination_date: date
    last_salary: Decimal  # severance base: last monthly salary (or average for hourly workers)
    service_periods: tuple[ServicePeriod, ...] = ()  # empty = start_date..termination_date
    severance_fund_balance: Decimal = ZERO  # deposits outside Section 14 periods
    entitled_to_severance: bool = True
    notice_days_given: Decimal = ZERO
    notice_required: bool = True
    vacation_balance: Decimal = ZERO
    unpaid_recuperation_days: Decimal = ZERO


@dataclass(frozen=True)
class TerminationResult:
    years_of_service: Decimal
    severance_entitlement: Decimal
    covered_by_section14: Decimal
    fund_balance_used: Decimal
    employer_severance_payment: Decimal
    severance_grant: Decimal
    exempt_severance: Decimal
    taxable_severance: Decimal
    notice_days_due: Decimal
    notice_pay: Decimal
    vacation_payout: Decimal
    recuperation_payout: Decimal
    trace: Trace

    @property
    def total_employer_payment(self) -> Decimal:
        return (
            self.employer_severance_payment
            + self.notice_pay
            + self.vacation_payout
            + self.recuperation_payout
        )


def years_between(start: date, end: date) -> Decimal:
    """Service in years from `start` through `end`: whole months / 12 plus leftover days / 365."""
    months = service_months(start, end)
    leftover = (end + timedelta(days=1) - add_months(start, months)).days
    return Decimal(months) / Decimal(12) + Decimal(leftover) / DAYS_PER_YEAR


def notice_days(months_of_service: int, schedule: Any, full_month_days: Decimal) -> Decimal:
    """Notice entitlement from a segment schedule: base_days + days_per_month x months past
    the segment start, or a full month once `full_month_after_months` is reached."""
    if months_of_service >= schedule["full_month_after_months"]:
        return full_month_days
    days = ZERO
    for segment in schedule["segments"]:
        if months_of_service < segment["from_month"]:
            break
        days = D(segment["base_days"]) + D(segment["days_per_month"]) * (
            months_of_service - segment["from_month"]
        )
    return days


def calculate_termination(inp: TerminationInput, rules: RuleSet) -> TerminationResult:
    resolved = rules.at(inp.termination_date)
    trace: list[TraceEntry] = []

    def explain(rule_id: str, formula: str, result: Decimal, **inputs: object) -> None:
        trace.append(
            TraceEntry(
                rule_id,
                rule_id,
                formula,
                tuple((k, str(v)) for k, v in inputs.items()),
                result,
                resolved.version,
            )
        )

    periods = inp.service_periods or (ServicePeriod(inp.employee.start_date, inp.termination_date),)
    severance = _severance(inp, periods, resolved, explain)
    notice_due, notice_pay = _notice(inp, resolved, explain)
    vacation_payout = _vacation_payout(inp, resolved, explain)
    recuperation_payout = round_agorot(
        inp.unpaid_recuperation_days * D(resolved.value(RECUPERATION_RULE)["day_value"])
    )
    explain(
        "termination.recuperation",
        "unpaid_days x day_value",
        recuperation_payout,
        unpaid_days=inp.unpaid_recuperation_days,
    )

    return TerminationResult(
        *severance,
        notice_days_due=notice_due,
        notice_pay=notice_pay,
        vacation_payout=vacation_payout,
        recuperation_payout=recuperation_payout,
        trace=Trace(tuple(trace)),
    )


def _severance(
    inp: TerminationInput, periods: Sequence[ServicePeriod], rules: ResolvedRules, explain: Any
) -> tuple[Decimal, Decimal, Decimal, Decimal, Decimal, Decimal, Decimal, Decimal]:
    cfg = rules.value(SEVERANCE_RULE)
    full_rate = D(cfg["full_rate"])
    years = sum((years_between(p.start, p.end) for p in periods), ZERO)
    if not inp.entitled_to_severance:
        return years, ZERO, ZERO, ZERO, ZERO, ZERO, ZERO, ZERO

    entitlement = covered = outside_s14 = ZERO
    for period in periods:
        amount = inp.last_salary * years_between(period.start, period.end)
        entitlement += amount
        if period.section14_rate is None:
            outside_s14 += amount
        else:
            # Section 14 deposits replace severance for their period, in proportion to the rate.
            covered += amount * min(period.section14_rate / full_rate, Decimal(1))
            # Under a partial arrangement the employer owes the uncovered share.
            outside_s14 += amount * max(Decimal(1) - period.section14_rate / full_rate, ZERO)

    entitlement, covered = round_agorot(entitlement), round_agorot(covered)
    fund_used = round_agorot(min(inp.severance_fund_balance, outside_s14))
    employer_pays = round_agorot(outside_s14 - fund_used)
    grant = covered + fund_used + employer_pays

    exempt_cap = min(D(cfg["exempt_per_year"]), inp.last_salary * D(cfg["exempt_salary_multiple"]))
    exempt = round_agorot(min(grant, exempt_cap * years))
    explain(
        "termination.severance",
        "last_salary x years; Section 14 share covered by deposits; rest from fund then employer",
        grant,
        last_salary=inp.last_salary,
        years=round_agorot(years),
        covered=covered,
        fund_used=fund_used,
        employer_pays=employer_pays,
        exempt=exempt,
    )
    return years, entitlement, covered, fund_used, employer_pays, grant, exempt, grant - exempt


def _notice(inp: TerminationInput, rules: ResolvedRules, explain: Any) -> tuple[Decimal, Decimal]:
    if not inp.notice_required:
        return ZERO, ZERO
    cfg = rules.value(NOTICE_RULE)
    months = service_months(inp.employee.start_date, inp.termination_date)
    schedule = cfg["hourly" if inp.employee.kind is EmploymentKind.HOURLY else "monthly"]
    required = notice_days(months, schedule, D(cfg["full_month_days"]))
    due = max(required - inp.notice_days_given, ZERO)
    pay = round_agorot(due * inp.last_salary / D(cfg["daily_divisor"]))
    explain(
        "termination.notice",
        "max(required - given, 0) x last_salary / daily_divisor",
        pay,
        months_of_service=months,
        required_days=required,
        given_days=inp.notice_days_given,
    )
    return due, pay


def _vacation_payout(inp: TerminationInput, rules: ResolvedRules, explain: Any) -> Decimal:
    if inp.vacation_balance <= ZERO:
        return ZERO
    divisor = D(rules.value(VACATION_RULE)["redemption_divisor"][str(inp.employee.work_week)])
    payout = round_agorot(inp.vacation_balance * inp.last_salary / divisor)
    explain(
        "termination.vacation",
        "balance x last_salary / redemption_divisor",
        payout,
        balance=inp.vacation_balance,
        divisor=divisor,
    )
    return payout
