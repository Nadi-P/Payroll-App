"""Pay-period helpers. Israeli work weeks run Sunday-Thursday (5 days) or Sunday-Friday (6 days)."""

from __future__ import annotations

import calendar
from collections.abc import Set
from dataclasses import dataclass
from datetime import date, timedelta

# date.weekday(): Monday=0 ... Sunday=6
_FIVE_DAY_WEEK = frozenset({6, 0, 1, 2, 3})  # Sun-Thu
_SIX_DAY_WEEK = frozenset({6, 0, 1, 2, 3, 4})  # Sun-Fri
_NO_HOLIDAYS: frozenset[date] = frozenset()

WEEKDAYS = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


@dataclass(frozen=True, order=True)
class Period:
    year: int
    month: int

    def __post_init__(self) -> None:
        if not 1 <= self.month <= 12:
            raise ValueError(f"month must be 1-12, got {self.month}")

    @property
    def first_day(self) -> date:
        return date(self.year, self.month, 1)

    @property
    def last_day(self) -> date:
        return date(self.year, self.month, calendar.monthrange(self.year, self.month)[1])

    @property
    def calendar_days(self) -> int:
        return self.last_day.day

    def work_days(self, work_week: int, holidays: Set[date] = _NO_HOLIDAYS) -> int:
        """Scheduled working days in the period, excluding `holidays`, before absences."""
        return count_work_days(self.first_day, self.last_day, work_week, holidays)


def is_work_day(day: date, work_week: int) -> bool:
    """Whether `day` is a scheduled day of a 5-day (Sun-Thu) or 6-day (Sun-Fri) week."""
    if work_week == 5:
        return day.weekday() in _FIVE_DAY_WEEK
    if work_week == 6:
        return day.weekday() in _SIX_DAY_WEEK
    raise ValueError(f"work_week must be 5 or 6, got {work_week}")


def count_work_days(
    start: date, end: date, work_week: int, holidays: Set[date] = _NO_HOLIDAYS
) -> int:
    """Working days in [start, end] inclusive, skipping holidays."""
    if work_week not in (5, 6):
        raise ValueError(f"work_week must be 5 or 6, got {work_week}")
    total = (end - start).days + 1
    return sum(
        1
        for i in range(max(total, 0))
        if is_work_day(day := start + timedelta(days=i), work_week) and day not in holidays
    )


def add_months(day: date, months: int) -> date:
    """Shift by whole months, clamping to the last day of a shorter month."""
    index = day.year * 12 + day.month - 1 + months
    year, month = divmod(index, 12)
    last = calendar.monthrange(year, month + 1)[1]
    return date(year, month + 1, min(day.day, last))


def service_months(start: date, through: date) -> int:
    """Completed months of service from `start` through the end of day `through`."""
    end = through + timedelta(days=1)
    months = (end.year - start.year) * 12 + end.month - start.month
    if add_months(start, months) > end:
        months -= 1
    return max(months, 0)


def age_on(birth_date: date, on: date) -> int:
    """Age in whole years on a given date."""
    years = on.year - birth_date.year
    if (on.month, on.day) < (birth_date.month, birth_date.day):
        years -= 1
    return years
