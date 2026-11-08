"""Stage 1: entered pay lines, base salary or hourly pay, unpaid absence and overtime."""

from __future__ import annotations

from decimal import Decimal

from payroll_engine.calculators.hours import HOURS_RULE, classify, hours_rules
from payroll_engine.components import ComponentKind
from payroll_engine.context import Context
from payroll_engine.models.inputs import EmploymentKind
from payroll_engine.money import HUNDRED, ZERO, D


def run(ctx: Context) -> None:
    _entered_lines(ctx)
    if ctx.employee.kind is EmploymentKind.MONTHLY:
        _monthly_salary(ctx)
    _timesheet(ctx)


def monthly_salary(ctx: Context) -> Decimal:
    salary = ctx.employee.monthly_salary
    if salary is None:
        raise ValueError(f"employee {ctx.employee.employee_id}: monthly_salary is required")
    return salary


def hourly_value(ctx: Context) -> Decimal:
    """Value of one regular hour: the hourly rate, or monthly salary / monthly hours divisor."""
    emp = ctx.employee
    if emp.kind is EmploymentKind.HOURLY:
        if emp.hourly_rate is None:
            raise ValueError(f"employee {emp.employee_id}: hourly_rate is required")
        return emp.hourly_rate
    return monthly_salary(ctx) / D(ctx.rules.value(HOURS_RULE)["monthly_hours_divisor"])


def _entered_lines(ctx: Context) -> None:
    for line in ctx.inp.lines:
        if ctx.catalog.get(line.code).kind is ComponentKind.DEDUCTION:
            raise ValueError(f"{line.code} is a deduction; pass it in `deductions`")
        ctx.add_line(line.code, line.amount, quantity=line.quantity, rate=line.rate)


def _monthly_salary(ctx: Context) -> None:
    salary = monthly_salary(ctx)
    fraction = ctx.employed_fraction()
    ctx.add_line(
        "BASE_SALARY",
        salary * fraction,
        formula="monthly_salary x employed_fraction",
        monthly_salary=salary,
        employed_fraction=fraction,
    )

    absent = ctx.inp.leave.unpaid_absence_days
    if absent > ZERO:
        work_days = Decimal(ctx.work_days())
        daily = salary / work_days
        ctx.add_line(
            "UNPAID_ABSENCE",
            -daily * absent,
            quantity=absent,
            rate=daily,
            formula="-(monthly_salary / work_days) x days",
            monthly_salary=salary,
            work_days=work_days,
            days=absent,
        )


def _timesheet(ctx: Context) -> None:
    if not ctx.inp.timesheet:
        return
    limits = hours_rules(ctx.rules, ctx.employee.work_week)
    buckets = classify(ctx.inp.timesheet, limits, ctx.holidays)
    hour = hourly_value(ctx)
    rates = ctx.rules.value(HOURS_RULE)["rates"]

    if ctx.employee.kind is EmploymentKind.HOURLY:
        ctx.add_line(
            "HOURLY_PAY",
            buckets.regular * hour,
            quantity=buckets.regular,
            rate=hour,
            formula="regular_hours x hourly_rate",
            regular_hours=buckets.regular,
            hourly_rate=hour,
        )

    premiums = (
        ("OVERTIME_125", buckets.overtime_first, rates["overtime_first"]),
        ("OVERTIME_150", buckets.overtime_after, rates["overtime_after"]),
        ("REST_DAY_150", buckets.rest_day, rates["rest_day"]),
        ("REST_DAY_175", buckets.rest_overtime_first, rates["rest_overtime_first"]),
        ("REST_DAY_200", buckets.rest_overtime_after, rates["rest_overtime_after"]),
    )
    for code, hours, percent in premiums:
        if hours == ZERO:
            continue
        rate = hour * D(percent) / HUNDRED
        ctx.add_line(
            code,
            hours * rate,
            quantity=hours,
            rate=rate,
            formula="hours x hour_value x premium%",
            hours=hours,
            hour_value=hour,
            premium=percent,
        )
