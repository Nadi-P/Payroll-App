"""Invariants that must hold for any salary."""

from decimal import Decimal

from hypothesis import given, settings
from hypothesis import strategies as st

from payroll_engine import calculate
from payroll_engine.models import PensionProfile
from tests.conftest import RULES, employee, payslip_input

salaries = st.decimals(
    min_value=0, max_value=400_000, places=2, allow_nan=False, allow_infinity=False
)


@settings(max_examples=150, deadline=None)
@given(salaries)
def test_net_never_exceeds_gross(salary: Decimal) -> None:
    slip = calculate(
        payslip_input(employee(monthly_salary=salary, pension=PensionProfile())), RULES
    )
    assert slip.net_pay <= slip.bases.gross_cash
    assert slip.income_tax.tax >= 0
    assert slip.employer_cost >= slip.bases.gross_cash


@settings(max_examples=150, deadline=None)
@given(salaries, st.decimals(min_value=Decimal("0.01"), max_value=5000, places=2))
def test_more_salary_never_means_less_tax_or_less_net(salary: Decimal, raise_by: Decimal) -> None:
    low = calculate(payslip_input(employee(monthly_salary=salary)), RULES)
    high = calculate(payslip_input(employee(monthly_salary=salary + raise_by)), RULES)
    assert high.income_tax.tax >= low.income_tax.tax
    assert high.national_insurance.employee_total >= low.national_insurance.employee_total
    # Tax and each insurance tier round to the agora separately, so a tiny raise can cost
    # up to 3 agorot of rounding; beyond that, a raise must never lower net pay.
    assert high.net_pay >= low.net_pay - Decimal("0.03")


@settings(max_examples=50, deadline=None)
@given(salaries)
def test_calculation_is_deterministic(salary: Decimal) -> None:
    inp = payslip_input(employee(monthly_salary=salary))
    assert calculate(inp, RULES) == calculate(inp, RULES)
