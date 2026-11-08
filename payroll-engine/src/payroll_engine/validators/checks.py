"""Pre-approval checks. They flag problems; they never change amounts."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from decimal import Decimal

from payroll_engine.dates import age_on, service_months
from payroll_engine.models.inputs import EmploymentKind, PayslipInput
from payroll_engine.models.payslip import Flag, Payslip, Severity
from payroll_engine.money import ZERO, D
from payroll_engine.rules import ResolvedRules

OVERTIME_CODES = (
    "OVERTIME_125",
    "OVERTIME_150",
    "REST_DAY_150",
    "REST_DAY_175",
    "REST_DAY_200",
)

Check = Callable[[Payslip, PayslipInput, ResolvedRules, Sequence[Payslip]], list[Flag]]


def check(
    payslip: Payslip,
    inp: PayslipInput,
    rules: ResolvedRules,
    history: Sequence[Payslip] = (),
) -> tuple[Flag, ...]:
    flags: list[Flag] = []
    for rule in _CHECKS:
        flags.extend(rule(payslip, inp, rules, history))
    return tuple(flags)


def _minimum_wage(
    p: Payslip, inp: PayslipInput, rules: ResolvedRules, _: Sequence[Payslip]
) -> list[Flag]:
    emp = inp.employee
    cfg = rules.value("labor.minimum_wage")
    if emp.kind is EmploymentKind.HOURLY and emp.hourly_rate is not None:
        minimum = D(cfg["hourly"])
        if emp.hourly_rate < minimum:
            return [
                Flag(
                    "BELOW_MINIMUM_WAGE",
                    Severity.ERROR,
                    f"hourly rate {emp.hourly_rate} is below the minimum {minimum}",
                )
            ]
    if (
        emp.kind is EmploymentKind.MONTHLY
        and emp.monthly_salary is not None
        and emp.job_fraction > ZERO
    ):
        full_time = emp.monthly_salary / emp.job_fraction
        minimum = D(cfg["monthly"])
        if full_time < minimum:
            return [
                Flag(
                    "BELOW_MINIMUM_WAGE",
                    Severity.ERROR,
                    f"full-time equivalent salary {full_time:.2f} is below the minimum {minimum}",
                )
            ]
    return []


def _pension_missing(
    p: Payslip, inp: PayslipInput, rules: ResolvedRules, _: Sequence[Payslip]
) -> list[Flag]:
    emp = inp.employee
    if emp.pension is not None:
        return []
    cfg = rules.value("pension.mandatory")
    waiting = cfg["waiting_months_with_prior_fund" if emp.had_prior_pension else "waiting_months"]
    old_enough = age_on(emp.birth_date, inp.period.last_day) >= cfg["min_age"][emp.gender.value]
    if old_enough and service_months(emp.start_date, inp.period.last_day) >= waiting:
        return [
            Flag(
                "PENSION_MISSING",
                Severity.ERROR,
                "employee is past the mandatory pension waiting period but has no pension fund",
            )
        ]
    return []


def _credit_points_missing(
    p: Payslip, inp: PayslipInput, rules: ResolvedRules, _: Sequence[Payslip]
) -> list[Flag]:
    profile = inp.employee.tax
    if (
        profile.resident
        and profile.main_employer
        and profile.fixed_rate is None
        and profile.coordination is None
        and p.income_tax.credit_points == ZERO
    ):
        return [
            Flag(
                "NO_CREDIT_POINTS",
                Severity.WARNING,
                "main employer with zero credit points - check Form 101",
            )
        ]
    return []


def _overtime_spike(
    p: Payslip, inp: PayslipInput, rules: ResolvedRules, history: Sequence[Payslip]
) -> list[Flag]:
    if not history:
        return []
    cfg = rules.value("validation.thresholds")
    current = sum((p.line(code) for code in OVERTIME_CODES), ZERO)
    past = [sum((h.line(code) for code in OVERTIME_CODES), ZERO) for h in history]
    average = sum(past, ZERO) / Decimal(len(past))
    if current >= D(cfg["overtime_spike_min_amount"]) and current > average * D(
        cfg["overtime_spike_multiplier"]
    ):
        return [
            Flag(
                "OVERTIME_SPIKE",
                Severity.WARNING,
                f"overtime {current} is far above the recent average {average:.2f}",
            )
        ]
    return []


def _insurance_ceiling(
    p: Payslip, inp: PayslipInput, rules: ResolvedRules, _: Sequence[Payslip]
) -> list[Flag]:
    ceiling = D(rules.value("national_insurance.thresholds")["ceiling"])
    if p.national_insurance.insurable > ceiling:
        return [
            Flag(
                "INSURANCE_CEILING",
                Severity.INFO,
                f"insurable income above the ceiling {ceiling}; excess not insured",
            )
        ]
    return []


def _net_and_deductions(
    p: Payslip, inp: PayslipInput, rules: ResolvedRules, _: Sequence[Payslip]
) -> list[Flag]:
    flags: list[Flag] = []
    if p.net_pay < ZERO:
        flags.append(Flag("NEGATIVE_NET", Severity.ERROR, f"net pay is negative ({p.net_pay})"))
    unapplied = sum((d.unapplied for d in p.deductions), ZERO)
    if unapplied > ZERO:
        flags.append(
            Flag(
                "DEDUCTIONS_NOT_APPLIED",
                Severity.WARNING,
                f"{unapplied} of deductions did not fit in net pay",
            )
        )
    if p.income_tax.tax < ZERO:
        flags.append(
            Flag(
                "TAX_REFUND",
                Severity.INFO,
                f"cumulative method refunds {-p.income_tax.tax} of income tax",
            )
        )
    return flags


def _unverified_rules(
    p: Payslip, inp: PayslipInput, rules: ResolvedRules, _: Sequence[Payslip]
) -> list[Flag]:
    if not p.unverified_rules:
        return []
    return [
        Flag(
            "UNVERIFIED_RULES",
            Severity.INFO,
            "rule values not yet confirmed against an official source: "
            + ", ".join(p.unverified_rules),
        )
    ]


def _vacation_overdrawn(
    p: Payslip, inp: PayslipInput, rules: ResolvedRules, _: Sequence[Payslip]
) -> list[Flag]:
    if p.balances.vacation < ZERO:
        return [
            Flag(
                "VACATION_OVERDRAWN",
                Severity.WARNING,
                f"vacation balance is negative ({p.balances.vacation} days)",
            )
        ]
    return []


_CHECKS: tuple[Check, ...] = (
    _minimum_wage,
    _pension_missing,
    _credit_points_missing,
    _overtime_spike,
    _insurance_ceiling,
    _net_and_deductions,
    _vacation_overdrawn,
    _unverified_rules,
)
