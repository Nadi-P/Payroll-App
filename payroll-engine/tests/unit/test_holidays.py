"""April 2026 holds three Jewish holidays on working days: Passover 2.4 (Thu), Passover day 7
8.4 (Wed) and Independence Day 22.4 (Wed). October 2026 adds election day 27.10 (Tue)."""

from datetime import date
from decimal import Decimal

import pytest

from payroll_engine import calculate
from payroll_engine.dates import Period, count_work_days
from payroll_engine.models import EmploymentKind, LeaveInputs, WorkDay
from payroll_engine.rules import RuleError, RuleSet
from tests.conftest import employee, payslip_input

APRIL = Period(2026, 4)
HOURLY = {"kind": EmploymentKind.HOURLY, "monthly_salary": None, "hourly_rate": Decimal("50")}


def test_count_work_days_skips_holidays() -> None:
    holidays = {date(2026, 4, 2), date(2026, 4, 4)}  # a Thursday and a Saturday
    plain = count_work_days(APRIL.first_day, APRIL.last_day, 5)
    assert count_work_days(APRIL.first_day, APRIL.last_day, 5, holidays) == plain - 1


def test_holidays_reduce_daily_wage_divisor(rules: RuleSet) -> None:
    leave = LeaveInputs(unpaid_absence_days=Decimal("1"))
    slip = calculate(payslip_input(period=APRIL, leave=leave), rules)
    # April 2026 has 22 Sun-Thu days, 3 of them holidays -> 19 working days
    assert slip.line("UNPAID_ABSENCE") == Decimal("-526.32")  # 10000 / 19


def test_hourly_holiday_pay_is_counted_from_calendar(rules: RuleSet) -> None:
    slip = calculate(payslip_input(employee(**HOURLY), period=APRIL), rules)
    assert slip.line("HOLIDAY_PAY") == Decimal("1260.00")  # 3 days x 50 x 8.4


def test_entered_holiday_days_override_calendar(rules: RuleSet) -> None:
    leave = LeaveInputs(holiday_days=1)
    slip = calculate(payslip_input(employee(**HOURLY), period=APRIL, leave=leave), rules)
    assert slip.line("HOLIDAY_PAY") == Decimal("420.00")


def test_no_holiday_pay_before_three_months(rules: RuleSet) -> None:
    emp = employee(**HOURLY, start_date=date(2026, 3, 1))
    assert calculate(payslip_input(emp, period=APRIL), rules).line("HOLIDAY_PAY") == 0


def test_saturday_holiday_is_unpaid(rules: RuleSet) -> None:
    # September 2026: Rosh Hashanah day 1 (12.9) and Sukkot (26.9) fall on Saturday.
    slip = calculate(payslip_input(employee(**HOURLY), period=Period(2026, 9)), rules)
    assert slip.line("HOLIDAY_PAY") == Decimal("840.00")  # 13.9 (Sun) and 21.9 (Mon) only


def test_election_day_applies_to_every_calendar(rules: RuleSet) -> None:
    slip = calculate(payslip_input(employee(**HOURLY), period=Period(2026, 10)), rules)
    # 3.10 Simchat Torah is a Saturday; 27.10 election day is paid
    assert slip.line("HOLIDAY_PAY") == Decimal("420.00")


def test_work_on_holiday_earns_rest_day_premium(rules: RuleSet) -> None:
    day = WorkDay(date(2026, 4, 22), Decimal("8"))  # not marked as rest day
    slip = calculate(payslip_input(employee(**HOURLY), period=APRIL, timesheet=(day,)), rules)
    assert slip.line("REST_DAY_150") == Decimal("600.00")
    assert slip.line("HOURLY_PAY") == 0


def test_unknown_holiday_calendar(rules: RuleSet) -> None:
    with pytest.raises(RuleError, match="holiday calendar"):
        calculate(payslip_input(employee(holiday_calendar="druze")), rules)
