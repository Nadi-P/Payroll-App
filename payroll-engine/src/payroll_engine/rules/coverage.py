"""Which rules the engine needs, and whether the loaded rule data covers a range of months."""

from __future__ import annotations

from payroll_engine.dates import Period
from payroll_engine.rules.loader import RuleNotFoundError, RuleSet

REQUIRED_RULES: tuple[str, ...] = (
    "income_tax.brackets",
    "income_tax.surtax",
    "income_tax.credit_point_value",
    "income_tax.credit_points",
    "income_tax.secondary_job",
    "income_tax.pension_credit",
    "national_insurance.thresholds",
    "national_insurance.rates",
    "national_insurance.ages",
    "pension.mandatory",
    "pension.employer_exemption",
    "pension.study_fund",
    "labor.minimum_wage",
    "labor.hours",
    "labor.travel",
    "labor.recuperation",
    "labor.vacation",
    "labor.sick_leave",
    "labor.holidays",
    "labor.reserve_duty",
    "benefits.car",
    "benefits.phone",
    "termination.severance",
    "termination.notice",
    "validation.thresholds",
    "components.catalog",
    "calendar.holidays",
)


def coverage_gaps(rules: RuleSet, first: Period, last: Period) -> tuple[tuple[Period, str], ...]:
    """Every (month, rule_id) in [first, last] for which no rule version is in force."""
    gaps: list[tuple[Period, str]] = []
    index = first.year * 12 + first.month - 1
    end = last.year * 12 + last.month - 1
    while index <= end:
        period = Period(index // 12, index % 12 + 1)
        resolved = rules.at(period.last_day)
        for rule_id in REQUIRED_RULES:
            try:
                resolved.entry(rule_id)
            except RuleNotFoundError:
                gaps.append((period, rule_id))
        index += 1
    return tuple(gaps)
