from datetime import date
from decimal import Decimal

import pytest

from payroll_engine import calculate
from payroll_engine.models import EmploymentKind, LeaveInputs, SickDay
from payroll_engine.rules import RuleSet
from tests.conftest import employee, payslip_input

EPISODE = tuple(SickDay(date(2026, 1, d), d - 4) for d in (5, 6, 7))  # days 1-3 of an episode


def test_accruals_and_balances(rules: RuleSet) -> None:
    inp = payslip_input(
        leave=LeaveInputs(
            vacation_opening=Decimal("5"),
            vacation_days_used=Decimal("2"),
            sick_opening=Decimal("10"),
        )
    )
    b = calculate(inp, rules).balances
    assert b.vacation_accrued == Decimal("1.25")  # service year 7 -> 15 days / 12
    assert b.vacation == Decimal("4.25")
    assert (b.sick_accrued, b.sick) == (Decimal("1.50"), Decimal("11.50"))


def test_sick_balance_is_capped(rules: RuleSet) -> None:
    b = calculate(payslip_input(leave=LeaveInputs(sick_opening=Decimal("90"))), rules).balances
    assert b.sick == Decimal("90")


def test_monthly_sick_days_deduct_unpaid_share(rules: RuleSet) -> None:
    slip = calculate(
        payslip_input(leave=LeaveInputs(sick_opening=Decimal("10"), sick_days=EPISODE)), rules
    )
    # paid share 0 + 0.5 + 0.5 = 1 day; 2 days unpaid at 10000 / 21
    assert slip.line("SICK_DEDUCTION") == Decimal("-952.38")
    assert slip.balances.sick == Decimal("8.50")


def test_sick_days_without_balance_are_unpaid(rules: RuleSet) -> None:
    slip = calculate(payslip_input(leave=LeaveInputs(sick_days=EPISODE)), rules)
    # only the 1.5 accrued days are available: day 1 (0%) uses one, day 2 has 0.5 left -> unpaid
    assert slip.line("SICK_DEDUCTION") == Decimal("-1428.57")


def test_hourly_employee_leave_pay(rules: RuleSet) -> None:
    emp = employee(kind=EmploymentKind.HOURLY, monthly_salary=None, hourly_rate=Decimal("50"))
    leave = LeaveInputs(
        vacation_opening=Decimal("10"),
        vacation_days_used=Decimal("2"),
        sick_opening=Decimal("10"),
        sick_days=EPISODE,
        holiday_days=1,
    )
    slip = calculate(payslip_input(emp, leave=leave), rules)
    daily = Decimal("420")  # 50 x 42 / 5
    assert slip.line("VACATION_PAY") == daily * 2
    assert slip.line("SICK_PAY") == daily
    assert slip.line("HOLIDAY_PAY") == daily


def test_reserve_duty(rules: RuleSet) -> None:
    leave = LeaveInputs(reserve_days=5, prior_three_months_gross=Decimal("30000"))
    slip = calculate(payslip_input(leave=leave), rules)
    assert slip.balances.reserve_duty_reimbursement == Decimal("1666.67")
    assert "RESERVE_DUTY_PAY" not in {line.code for line in slip.lines}  # salary continues
    with pytest.raises(ValueError):
        calculate(payslip_input(leave=LeaveInputs(reserve_days=1)), rules)


def test_unpaid_absence(rules: RuleSet) -> None:
    slip = calculate(payslip_input(leave=LeaveInputs(unpaid_absence_days=Decimal("2"))), rules)
    assert slip.line("UNPAID_ABSENCE") == Decimal("-952.38")
