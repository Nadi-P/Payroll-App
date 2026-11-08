from datetime import date
from decimal import Decimal
from typing import Any

import pytest

from payroll_engine import calculate, run_payroll
from payroll_engine.dates import Period
from payroll_engine.models import (
    Allowances,
    Deduction,
    EmployerSettings,
    EmploymentKind,
    InputError,
    LeaveInputs,
    PayLine,
    Severity,
    SickDay,
    TaxProfile,
    WorkDay,
    YearToDate,
)
from payroll_engine.rules import RuleSet
from tests.conftest import employee, payslip_input


@pytest.mark.parametrize(
    "overrides",
    [
        {"work_week": 4},
        {"job_fraction": Decimal("0")},
        {"job_fraction": Decimal("1.5")},
        {"birth_date": date(2021, 1, 1)},
        {"end_date": date(2019, 12, 31)},
        {"monthly_salary": None},
        {"monthly_salary": Decimal("-1")},
        {"kind": EmploymentKind.HOURLY},  # hourly without hourly_rate
        {"employee_id": " "},
    ],
)
def test_invalid_employee_rejected(overrides: dict[str, Any]) -> None:
    with pytest.raises(InputError):
        employee(**overrides)


@pytest.mark.parametrize(
    "build",
    [
        lambda: EmployerSettings(recuperation_month=13),
        lambda: WorkDay(date(2026, 1, 4), Decimal("25")),
        lambda: SickDay(date(2026, 1, 4), 0),
        lambda: LeaveInputs(sick_days=(SickDay(date(2026, 1, 4), 1),) * 2),
        lambda: LeaveInputs(reserve_days=-1),
        lambda: Allowances(car_type="diesel"),
        lambda: Deduction("UNION_FEE", Decimal("-5")),
        lambda: YearToDate(months=12),
    ],
)
def test_invalid_inputs_rejected(build: Any) -> None:
    with pytest.raises(InputError):
        build()


def test_employee_must_be_employed_in_period() -> None:
    with pytest.raises(InputError, match="not employed"):
        payslip_input(employee(start_date=date(2026, 3, 1)))
    with pytest.raises(InputError, match="not employed"):
        payslip_input(employee(end_date=date(2025, 12, 31)))
    with pytest.raises(InputError, match="ytd"):
        payslip_input(ytd=YearToDate(months=1))  # January has no earlier months


def test_severance_base_follows_catalog(rules: RuleSet) -> None:
    slip = calculate(payslip_input(lines=(PayLine("BONUS", Decimal("1000")),)), rules)
    assert slip.bases.severance == Decimal("10000.00")  # bonus is not severance-bearing


def test_vacation_overdrawn_and_non_resident_flags(rules: RuleSet) -> None:
    overdrawn = calculate(payslip_input(leave=LeaveInputs(vacation_days_used=Decimal("5"))), rules)
    assert "VACATION_OVERDRAWN" in {f.code for f in overdrawn.flags}
    non_resident = calculate(payslip_input(employee(tax=TaxProfile(resident=False))), rules)
    assert "NO_CREDIT_POINTS" not in {f.code for f in non_resident.flags}


def test_payroll_run(rules: RuleSet) -> None:
    run = run_payroll(
        [
            payslip_input(employee(employee_id="A")),
            payslip_input(employee(employee_id="B", monthly_salary=Decimal("5000"))),
        ],
        rules,
    )
    assert run.period == Period(2026, 1)
    assert run.form102.employees == 2
    assert {emp for emp, _ in run.flags(Severity.ERROR)} == {"A", "B"}  # no pension; B underpaid
    assert not run.can_approve


def test_payroll_run_rejects_mixed_input(rules: RuleSet) -> None:
    with pytest.raises(ValueError):
        run_payroll([], rules)
    with pytest.raises(ValueError):
        run_payroll([payslip_input(), payslip_input()], rules)
    with pytest.raises(ValueError):
        run_payroll([payslip_input(), payslip_input(period=Period(2026, 2))], rules)
