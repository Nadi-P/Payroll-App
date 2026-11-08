from datetime import date
from decimal import Decimal

from payroll_engine.rules import RuleSet
from payroll_engine.termination import (
    ServicePeriod,
    TerminationInput,
    calculate_termination,
    notice_days,
    years_between,
)
from tests.conftest import RULES, employee

END = date(2025, 12, 31)
NOTICE = RULES.at(END).value("termination.notice")


def _input(**overrides: object) -> TerminationInput:
    base = dict(employee=employee(), termination_date=END, last_salary=Decimal("10000"))
    base.update(overrides)
    return TerminationInput(**base)  # type: ignore[arg-type]


def test_years_between() -> None:
    assert years_between(date(2020, 1, 1), END) == 6
    assert years_between(date(2025, 1, 1), date(2025, 1, 31)) == Decimal(1) / 12


def test_severance_without_section14_uses_fund_then_employer(rules: RuleSet) -> None:
    r = calculate_termination(
        _input(severance_fund_balance=Decimal("30000"), notice_required=False), rules
    )
    assert r.severance_entitlement == Decimal("60000.00")
    assert (r.fund_balance_used, r.employer_severance_payment) == (
        Decimal("30000.00"),
        Decimal("30000.00"),
    )
    assert (r.exempt_severance, r.taxable_severance) == (Decimal("60000.00"), Decimal("0.00"))


def test_partial_section14(rules: RuleSet) -> None:
    periods = (ServicePeriod(date(2020, 1, 1), END, Decimal("6")),)
    r = calculate_termination(_input(service_periods=periods, notice_required=False), rules)
    assert r.covered_by_section14 == Decimal("43217.29")
    assert r.employer_severance_payment == Decimal("16782.71")
    assert r.severance_grant == Decimal("60000.00")


def test_full_section14_owes_nothing(rules: RuleSet) -> None:
    periods = (ServicePeriod(date(2020, 1, 1), END, Decimal("8.33")),)
    r = calculate_termination(_input(service_periods=periods, notice_required=False), rules)
    assert r.employer_severance_payment == 0


def test_severance_exemption_cap(rules: RuleSet) -> None:
    r = calculate_termination(_input(last_salary=Decimal("40000"), notice_required=False), rules)
    # 240000 grant, exempt 6 x 13750 = 82500
    assert r.exempt_severance == Decimal("82500.00")
    assert r.taxable_severance == Decimal("157500.00")


def test_notice_schedules() -> None:
    month = Decimal("30")
    assert notice_days(4, NOTICE["monthly"], month) == 4
    assert notice_days(9, NOTICE["monthly"], month) == Decimal("13.5")
    assert notice_days(24, NOTICE["monthly"], month) == 30
    assert notice_days(18, NOTICE["hourly"], month) == 17
    assert notice_days(40, NOTICE["hourly"], month) == 30


def test_notice_vacation_and_recuperation_payout(rules: RuleSet) -> None:
    r = calculate_termination(
        _input(
            notice_days_given=Decimal("10"),
            vacation_balance=Decimal("10"),
            unpaid_recuperation_days=Decimal("2"),
            entitled_to_severance=False,
        ),
        rules,
    )
    assert r.severance_grant == 0
    assert (r.notice_days_due, r.notice_pay) == (Decimal("20"), Decimal("6666.67"))
    assert r.vacation_payout == Decimal("4614.67")
    assert r.recuperation_payout == Decimal("836.00")
    assert r.total_employer_payment == Decimal("12117.34")
