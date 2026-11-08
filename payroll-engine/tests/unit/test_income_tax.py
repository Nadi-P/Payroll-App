from datetime import date
from decimal import Decimal

from payroll_engine.calculators.income_tax import bracket_tax, brackets, credit_points, surtax
from payroll_engine.models import Child, CreditPointClaim, Gender, TaxProfile
from payroll_engine.rules import RuleSet
from tests.conftest import employee

JAN_2026 = date(2026, 1, 31)


def test_bracket_tax_2026(rules: RuleSet) -> None:
    table = brackets(rules.at(JAN_2026))
    assert bracket_tax(Decimal("10000"), table) == Decimal("1119.60")
    assert bracket_tax(Decimal("0"), table) == Decimal("0")
    # Annual scale: 12 x monthly brackets
    assert bracket_tax(Decimal("120000"), table, 12) == Decimal("13435.20")


def test_2026_widening_changes_20_percent_bracket(rules: RuleSet) -> None:
    income = Decimal("19000")
    tax_2025 = bracket_tax(income, brackets(rules.at(date(2025, 12, 31))))
    tax_2026 = bracket_tax(income, brackets(rules.at(JAN_2026)))
    assert tax_2026 < tax_2025


def test_surtax_only_above_threshold(rules: RuleSet) -> None:
    resolved = rules.at(JAN_2026)
    assert surtax(Decimal("60130"), resolved) == 0
    assert surtax(Decimal("70130"), resolved) == Decimal("300")


def test_credit_points(rules: RuleSet) -> None:
    resolved = rules.at(JAN_2026)
    assert credit_points(employee(), JAN_2026, resolved) == Decimal("2.25")
    mother = employee(
        gender=Gender.FEMALE,
        tax=TaxProfile(
            children=(Child(date(2026, 1, 3)), Child(date(2022, 6, 1)), Child(date(2015, 1, 1))),
            claims=(
                CreditPointClaim("DEGREE", Decimal("1"), date(2026, 1, 1), date(2026, 12, 31)),
                CreditPointClaim("EXPIRED", Decimal("1"), None, date(2025, 12, 31)),
            ),
        ),
    )
    # 2.25 resident + 0.5 woman + 1.5 (born this year) + 2.5 (age 4) + 1 (age 11) + 1 degree
    assert credit_points(mother, JAN_2026, resolved) == Decimal("8.75")


def test_non_resident_gets_no_base_points(rules: RuleSet) -> None:
    emp = employee(tax=TaxProfile(resident=False))
    assert credit_points(emp, JAN_2026, rules.at(JAN_2026)) == 0
