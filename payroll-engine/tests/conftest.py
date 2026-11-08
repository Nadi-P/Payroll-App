from __future__ import annotations

from dataclasses import replace
from datetime import date
from decimal import Decimal
from typing import Any

import pytest

from payroll_engine import default_rules
from payroll_engine.dates import Period
from payroll_engine.models import (
    Employee,
    EmployerSettings,
    EmploymentKind,
    Gender,
    PayslipInput,
)
from payroll_engine.rules import RuleSet

RULES = default_rules()
JANUARY_2026 = Period(2026, 1)


@pytest.fixture(scope="session")
def rules() -> RuleSet:
    return RULES


def employee(**overrides: Any) -> Employee:
    base = Employee(
        employee_id="E1",
        birth_date=date(1990, 5, 1),
        gender=Gender.MALE,
        start_date=date(2020, 1, 1),
        kind=EmploymentKind.MONTHLY,
        monthly_salary=Decimal("10000"),
    )
    return replace(base, **overrides)


def payslip_input(
    emp: Employee | None = None, period: Period = JANUARY_2026, **overrides: Any
) -> PayslipInput:
    # Recuperation is paid in July by default here so January figures stay simple.
    base = PayslipInput(
        employee=emp or employee(),
        period=period,
        settings=EmployerSettings(recuperation_month=7),
    )
    return replace(base, **overrides)
