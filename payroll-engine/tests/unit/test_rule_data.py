"""The shipped rule data must cover every rule the engine reads, for every supported month."""

from datetime import date

import pytest

from payroll_engine.components import Catalog, ComponentKind
from payroll_engine.dates import Period
from payroll_engine.rules import REQUIRED_RULES, RuleSet, coverage_gaps

ENGINE_CODES = (
    "BASE_SALARY",
    "HOURLY_PAY",
    "UNPAID_ABSENCE",
    "OVERTIME_125",
    "OVERTIME_150",
    "REST_DAY_150",
    "REST_DAY_175",
    "REST_DAY_200",
    "TRAVEL",
    "RECUPERATION",
    "VACATION_PAY",
    "SICK_PAY",
    "SICK_DEDUCTION",
    "HOLIDAY_PAY",
    "RESERVE_DUTY_PAY",
    "CAR_BENEFIT",
    "PHONE_BENEFIT",
    "PENSION_IMPUTED",
    "SEVERANCE_IMPUTED",
    "STUDY_FUND_IMPUTED",
)

MONTHS = [Period(y, m) for y in (2025, 2026) for m in range(1, 13)]


@pytest.mark.parametrize("period", MONTHS, ids=str)
def test_every_required_rule_resolves(rules: RuleSet, period: Period) -> None:
    resolved = rules.at(period.last_day)
    for rule_id in REQUIRED_RULES:
        resolved.value(rule_id)


def test_catalog_has_every_engine_component(rules: RuleSet) -> None:
    catalog = Catalog.from_rules(rules.at(date(2026, 1, 1)))
    for code in ENGINE_CODES:
        assert catalog.get(code).kind is not ComponentKind.DEDUCTION


def test_unverified_rules_are_reported(rules: RuleSet) -> None:
    unverified = rules.at(date(2026, 1, 31)).unverified()
    assert "national_insurance.thresholds" not in unverified  # confirmed on btl.gov.il
    assert "income_tax.brackets" in unverified


def test_shipped_rules_cover_2025_and_2026(rules: RuleSet) -> None:
    assert coverage_gaps(rules, Period(2025, 1), Period(2026, 12)) == ()


def test_coverage_gaps_reports_missing_months(rules: RuleSet) -> None:
    gaps = coverage_gaps(rules, Period(2024, 12), Period(2025, 1))
    assert {period for period, _ in gaps} == {Period(2024, 12)}
