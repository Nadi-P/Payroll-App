from decimal import Decimal

import pytest

from payroll_engine import calculate
from payroll_engine.annual import annual_summary, form102, form126, reconcile_year
from payroll_engine.dates import Period
from payroll_engine.models import EmployerSettings, PayLine, Payslip
from payroll_engine.retro import diff
from payroll_engine.rules import RuleSet
from tests.conftest import employee, payslip_input


def _year(rules: RuleSet, emp_id: str = "E1") -> list[Payslip]:
    # Recuperation spread monthly keeps every month in the same tax bracket.
    return [
        calculate(
            payslip_input(
                employee(employee_id=emp_id), period=Period(2026, m), settings=EmployerSettings()
            ),
            rules,
        )
        for m in range(1, 13)
    ]


def test_steady_salary_reconciles_to_zero(rules: RuleSet) -> None:
    slips = _year(rules)
    result = reconcile_year(slips, rules)
    assert result.summary.months == 12
    assert result.summary.taxable == Decimal("120000.00") + sum(
        (s.line("RECUPERATION") for s in slips), Decimal(0)
    )
    # 12 monthly withholdings, each rounded to the agora: at most 12 x 0.005 drift
    assert abs(result.difference) <= Decimal("0.06")


def test_one_off_bonus_creates_annual_difference(rules: RuleSet) -> None:
    slips = _year(rules)
    slips[0] = calculate(payslip_input(lines=(PayLine("BONUS", Decimal("30000")),)), rules)
    # A January bonus is withheld at a high marginal rate; spread over the year less is due.
    assert reconcile_year(slips, rules).difference < 0


def test_year_to_date_reconciliation_uses_months_covered(rules: RuleSet) -> None:
    slips = _year(rules)[:9]
    ytd = reconcile_year(slips, rules, months=9)
    assert abs(ytd.difference) <= Decimal("0.05")  # steady pay: nothing to refund so far
    full = reconcile_year(slips, rules)
    assert full.difference < -500  # full-year brackets on 9 months overstate the refund
    with pytest.raises(ValueError):
        reconcile_year(slips, rules, months=0)


def test_summary_validation(rules: RuleSet) -> None:
    slip = calculate(payslip_input(), rules)
    with pytest.raises(ValueError):
        annual_summary([slip, slip])
    with pytest.raises(ValueError):
        annual_summary([])


def test_form126_and_form102(rules: RuleSet) -> None:
    a, b = _year(rules, "A"), _year(rules, "B")
    report = form126({"B": b, "A": a})
    assert [s.employee_id for s in report] == ["A", "B"]
    monthly = form102([a[0], b[0]])
    assert monthly.employees == 2
    assert monthly.tax_withheld == a[0].income_tax.tax * 2
    with pytest.raises(ValueError):
        form102([a[0], a[1]])


def test_retro_diff(rules: RuleSet) -> None:
    old = calculate(payslip_input(), rules)
    new = calculate(payslip_input(lines=(PayLine("BONUS", Decimal("1000")),)), rules)
    d = diff(old, new)
    assert d.lines == (("BONUS", Decimal("1000.00")),)
    assert d.gross_cash == Decimal("1000.00")
    assert d.net_pay < Decimal("1000") and d.income_tax > 0
