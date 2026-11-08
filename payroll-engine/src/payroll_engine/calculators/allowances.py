"""Stage 2: travel, recuperation pay and non-cash benefits (car, phone)."""

from __future__ import annotations

from decimal import Decimal

from payroll_engine.calculators.tables import step_value
from payroll_engine.context import Context
from payroll_engine.dates import service_months
from payroll_engine.money import HUNDRED, ZERO, D

TRAVEL_RULE = "labor.travel"
RECUPERATION_RULE = "labor.recuperation"
CAR_RULE = "benefits.car"
PHONE_RULE = "benefits.phone"


def run(ctx: Context) -> None:
    _travel(ctx)
    _recuperation(ctx)
    _car(ctx)
    _phone(ctx)


def _travel(ctx: Context) -> None:
    allowances = ctx.inp.allowances
    if allowances.travel_daily_cost is None:
        return
    days = allowances.attendance_days
    if days is None:
        days = ctx.work_days()
    cap = D(ctx.rules.value(TRAVEL_RULE)["daily_cap"])
    per_day = min(allowances.travel_daily_cost, cap)
    ctx.add_line(
        "TRAVEL",
        per_day * days,
        quantity=Decimal(days),
        rate=per_day,
        formula="min(daily_cost, daily_cap) x attendance_days",
        daily_cost=allowances.travel_daily_cost,
        daily_cap=cap,
        attendance_days=days,
    )


def recuperation_days(ctx: Context) -> Decimal:
    """Annual recuperation days for the employee's seniority and job fraction (0 if ineligible)."""
    cfg = ctx.rules.value(RECUPERATION_RULE)
    months = service_months(ctx.employee.start_date, ctx.period.last_day)
    if months < cfg["eligible_after_months"]:
        return ZERO
    years = max(months // 12, 1)
    return (
        step_value(cfg["days_by_seniority"], "from_year", years, "days") * ctx.employee.job_fraction
    )


def _recuperation(ctx: Context) -> None:
    payment_month = ctx.inp.settings.recuperation_month
    if payment_month is not None and payment_month != ctx.period.month:
        return
    days = recuperation_days(ctx)
    if days == ZERO:
        return
    day_value = D(ctx.rules.value(RECUPERATION_RULE)["day_value"])
    share = Decimal(1) if payment_month is not None else Decimal(1) / Decimal(12)
    ctx.add_line(
        "RECUPERATION",
        days * day_value * share,
        quantity=days * share,
        rate=day_value,
        formula="annual_days x day_value x share (1 in payment month, 1/12 if spread monthly)",
        annual_days=days,
        day_value=day_value,
        share=share,
    )


def _car(ctx: Context) -> None:
    price = ctx.inp.allowances.car_list_price
    if price is None:
        return
    cfg = ctx.rules.value(CAR_RULE)
    car_type = ctx.inp.allowances.car_type
    reduction = D(cfg["reductions"][car_type]) if car_type else ZERO
    rate = D(cfg["list_price_rate"])
    ctx.add_line(
        "CAR_BENEFIT",
        max(price * rate / HUNDRED - reduction, ZERO),
        formula="max(list_price x rate% - reduction, 0)",
        list_price=price,
        rate=rate,
        reduction=reduction,
    )


def _phone(ctx: Context) -> None:
    if not ctx.inp.allowances.mobile_phone:
        return
    value = D(ctx.rules.value(PHONE_RULE)["mobile_monthly"])
    ctx.add_line("PHONE_BENEFIT", value, formula="statutory monthly value", value=value)
