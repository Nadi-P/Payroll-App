"""Stage 3: vacation, sick leave, holidays and reserve duty, plus leave balances.

Monthly employees keep their salary during paid leave, so only unpaid parts are deducted.
Hourly employees are paid for leave days explicitly.
"""

from __future__ import annotations

from decimal import Decimal

from payroll_engine.calculators.allowances import recuperation_days
from payroll_engine.calculators.earnings import monthly_salary
from payroll_engine.calculators.hours import HOURS_RULE
from payroll_engine.calculators.tables import step_value
from payroll_engine.context import Context
from payroll_engine.dates import WEEKDAYS, service_months
from payroll_engine.models.inputs import EmploymentKind
from payroll_engine.models.payslip import Balances
from payroll_engine.money import HUNDRED, ZERO, D, round_agorot

VACATION_RULE = "labor.vacation"
SICK_RULE = "labor.sick_leave"
HOLIDAYS_RULE = "labor.holidays"
RESERVE_RULE = "labor.reserve_duty"


def run(ctx: Context) -> Balances:
    leave = ctx.inp.leave
    vacation, vacation_accrued = _vacation(ctx)
    sick, sick_accrued, sick_used = _sick(ctx)
    _holidays(ctx)
    reimbursement = _reserve_duty(ctx)
    recuperation_accrued, recuperation_used = _recuperation_days(ctx)
    return Balances(
        vacation=vacation,
        vacation_accrued=vacation_accrued,
        sick=sick,
        sick_accrued=sick_accrued,
        reserve_duty_reimbursement=reimbursement,
        vacation_opening=leave.vacation_opening,
        vacation_adjustment=leave.vacation_adjustment,
        vacation_used=leave.vacation_days_used,
        sick_opening=leave.sick_opening,
        sick_adjustment=leave.sick_adjustment,
        sick_used=sick_used,
        recuperation=leave.recuperation_opening
        + leave.recuperation_adjustment
        + recuperation_accrued
        - recuperation_used,
        recuperation_opening=leave.recuperation_opening,
        recuperation_adjustment=leave.recuperation_adjustment,
        recuperation_accrued=recuperation_accrued,
        recuperation_used=recuperation_used,
        reserve_days=Decimal(leave.reserve_days),
    )


def _recuperation_days(ctx: Context) -> tuple[Decimal, Decimal]:
    """Recuperation days earned this month (1/12 of the year's days) and days paid this month."""
    accrued = round_agorot(recuperation_days(ctx) / Decimal(12) * ctx.employed_fraction())
    used = sum((line.quantity or ZERO for line in ctx.lines if line.code == "RECUPERATION"), ZERO)
    return accrued, used


def daily_wage(ctx: Context) -> Decimal:
    """Wage for one leave day: explicit override, else salary / work days, else hourly x day."""
    leave = ctx.inp.leave
    if leave.daily_wage is not None:
        return leave.daily_wage
    emp = ctx.employee
    if emp.kind is EmploymentKind.MONTHLY:
        return monthly_salary(ctx) / Decimal(ctx.work_days())
    if emp.hourly_rate is None:
        raise ValueError(f"employee {emp.employee_id}: hourly_rate is required")
    day_hours = D(ctx.rules.value(HOURS_RULE)["weekly_limit"]) / Decimal(emp.work_week)
    return emp.hourly_rate * day_hours


def _accrual_factor(ctx: Context) -> Decimal:
    return ctx.employee.job_fraction * ctx.employed_fraction()


def _vacation(ctx: Context) -> tuple[Decimal, Decimal]:
    emp, leave = ctx.employee, ctx.inp.leave
    cfg = ctx.rules.value(VACATION_RULE)
    service_year = service_months(emp.start_date, ctx.period.last_day) // 12 + 1
    annual = step_value(
        cfg["days_by_seniority"][str(emp.work_week)], "from_year", service_year, "days"
    )
    accrued = round_agorot(annual / Decimal(12) * _accrual_factor(ctx))
    ctx.explain(
        "leave.vacation_accrual",
        "Vacation days accrued",
        "annual_days / 12 x job_fraction x employed_fraction",
        accrued,
        annual_days=annual,
        service_year=service_year,
    )
    used = leave.vacation_days_used
    if used > ZERO and emp.kind is EmploymentKind.HOURLY:
        wage = daily_wage(ctx)
        ctx.add_line(
            "VACATION_PAY",
            used * wage,
            quantity=used,
            rate=wage,
            formula="days_used x daily_wage",
            days_used=used,
            daily_wage=wage,
        )
    return leave.vacation_opening + leave.vacation_adjustment + accrued - used, accrued


def _sick_pay_percent(table: list[dict[str, int]], day_of_episode: int) -> Decimal:
    return step_value(table, "from_day", day_of_episode, "percent")


def _sick(ctx: Context) -> tuple[Decimal, Decimal, Decimal]:
    leave = ctx.inp.leave
    cfg = ctx.rules.value(SICK_RULE)
    cap = D(cfg["max_balance_days"])
    accrued = round_agorot(D(cfg["monthly_accrual_days"]) * _accrual_factor(ctx))
    available = min(leave.sick_opening + leave.sick_adjustment + accrued, cap)
    start = available
    if not leave.sick_days:
        return available, accrued, ZERO

    paid_share = ZERO  # sum over sick days of the paid percentage / 100
    days = Decimal(len(leave.sick_days))
    for sick_day in sorted(leave.sick_days, key=lambda s: s.day):
        if available >= 1:
            available -= 1
            paid_share += (
                _sick_pay_percent(cfg["pay_percent_by_day"], sick_day.day_of_episode) / HUNDRED
            )
        # without a balance the day is unpaid

    wage = daily_wage(ctx)
    if ctx.employee.kind is EmploymentKind.MONTHLY:
        unpaid_days = days - paid_share
        ctx.add_line(
            "SICK_DEDUCTION",
            -unpaid_days * wage,
            quantity=unpaid_days,
            rate=wage,
            formula="-(sick_days - paid_share) x daily_wage",
            sick_days=days,
            paid_share=paid_share,
            daily_wage=wage,
        )
    else:
        ctx.add_line(
            "SICK_PAY",
            paid_share * wage,
            quantity=paid_share,
            rate=wage,
            formula="paid_share x daily_wage",
            sick_days=days,
            paid_share=paid_share,
            daily_wage=wage,
        )
    return available, accrued, start - available


def paid_holidays(ctx: Context) -> int:
    """Calendar holidays during employment this month that are paid (not on an unpaid weekday)."""
    unpaid = {WEEKDAYS[name] for name in ctx.rules.value(HOLIDAYS_RULE)["unpaid_on_weekdays"]}
    emp, period = ctx.employee, ctx.period
    start = max(period.first_day, emp.start_date)
    end = min(period.last_day, emp.end_date or period.last_day)
    return sum(1 for day in ctx.holidays if start <= day <= end and day.weekday() not in unpaid)


def _holidays(ctx: Context) -> None:
    if ctx.employee.kind is not EmploymentKind.HOURLY:
        return  # a monthly salary already covers holidays
    eligible_after = ctx.rules.value(HOLIDAYS_RULE)["eligible_after_months"]
    if service_months(ctx.employee.start_date, ctx.period.last_day) < eligible_after:
        return
    entered = ctx.inp.leave.holiday_days
    days = paid_holidays(ctx) if entered is None else entered
    if days == 0:
        return
    wage = daily_wage(ctx)
    ctx.add_line(
        "HOLIDAY_PAY",
        wage * days,
        quantity=Decimal(days),
        rate=wage,
        formula="holiday_days x daily_wage",
        holiday_days=days,
        daily_wage=wage,
    )


def _reserve_duty(ctx: Context) -> Decimal:
    leave = ctx.inp.leave
    if leave.reserve_days == 0:
        return ZERO
    if leave.prior_three_months_gross is None:
        raise ValueError("reserve duty requires prior_three_months_gross")
    divisor = D(ctx.rules.value(RESERVE_RULE)["divisor_days"])
    reimbursement = round_agorot(leave.prior_three_months_gross / divisor * leave.reserve_days)
    ctx.explain(
        "leave.reserve_duty",
        "Reserve duty reimbursement claimable from National Insurance",
        "prior_three_months_gross / divisor_days x reserve_days",
        reimbursement,
        prior_three_months_gross=leave.prior_three_months_gross,
        reserve_days=leave.reserve_days,
    )
    if ctx.employee.kind is EmploymentKind.HOURLY:
        ctx.add_line("RESERVE_DUTY_PAY", reimbursement, quantity=Decimal(leave.reserve_days))
    return reimbursement
