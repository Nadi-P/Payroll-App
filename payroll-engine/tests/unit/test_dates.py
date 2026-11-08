from datetime import date

import pytest

from payroll_engine.dates import Period, count_work_days


def test_period_bounds() -> None:
    p = Period(2024, 2)
    assert p.first_day == date(2024, 2, 1)
    assert p.last_day == date(2024, 2, 29)
    assert p.calendar_days == 29


def test_period_rejects_bad_month() -> None:
    with pytest.raises(ValueError):
        Period(2025, 13)


def test_work_days_five_and_six_day_week() -> None:
    # March 2025 starts on a Saturday: 22 Sun-Thu days plus 4 Fridays
    p = Period(2025, 3)
    assert p.work_days(5) == 22
    assert p.work_days(6) == 26


def test_work_days_invalid_week_and_reversed_range() -> None:
    with pytest.raises(ValueError):
        count_work_days(date(2025, 1, 1), date(2025, 1, 31), 7)
    assert count_work_days(date(2025, 1, 10), date(2025, 1, 1), 5) == 0
