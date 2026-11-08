from datetime import date
from decimal import Decimal

import pytest

from payroll_engine.calculators.hours import HoursRules, classify, week_start
from payroll_engine.models import WorkDay

RULES = HoursRules(
    daily_regular=Decimal("8.6"),
    night_daily_regular=Decimal("7"),
    weekly_limit=Decimal("42"),
    first_overtime_hours=Decimal("2"),
)


def test_week_starts_on_sunday() -> None:
    assert week_start(date(2026, 1, 8)) == date(2026, 1, 4)  # Thursday -> Sunday
    assert week_start(date(2026, 1, 4)) == date(2026, 1, 4)


def test_daily_overtime_tiers() -> None:
    b = classify([WorkDay(date(2026, 1, 4), Decimal("11"))], RULES)
    assert (b.regular, b.overtime_first, b.overtime_after) == (
        Decimal("8.6"),
        Decimal("2"),
        Decimal("0.4"),
    )


def test_weekly_limit_moves_regular_hours_to_overtime() -> None:
    week = [WorkDay(date(2026, 1, d), Decimal("9")) for d in range(4, 9)]  # Sun-Thu, 9h each
    b = classify(week, RULES)
    assert b.regular == Decimal("42")
    assert b.overtime_first == Decimal("3")  # 5 x 0.4 daily + 1 weekly excess


def test_rest_day_and_night_shift() -> None:
    b = classify(
        [
            WorkDay(date(2026, 1, 10), Decimal("10"), rest_day=True),
            WorkDay(date(2026, 1, 11), Decimal("8"), night=True),
        ],
        RULES,
    )
    assert (b.rest_day, b.rest_overtime_first) == (Decimal("8.6"), Decimal("1.4"))
    assert (b.regular, b.overtime_first) == (Decimal("7"), Decimal("1"))


def test_duplicate_and_negative_days_rejected() -> None:
    with pytest.raises(ValueError):
        classify([WorkDay(date(2026, 1, 4), Decimal("1"))] * 2, RULES)
    with pytest.raises(ValueError):
        classify([WorkDay(date(2026, 1, 4), Decimal("-1"))], RULES)
