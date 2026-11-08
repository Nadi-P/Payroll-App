"""Split a timesheet into regular, overtime and rest-day hour buckets.

Daily: hours past the daily limit are overtime (first tier, then second tier).
Weekly: regular weekday hours past the weekly limit become first-tier overtime.
Rest days and holidays (marked on the row or listed in `holidays`): all hours carry the
rest-day premium, overtime there is higher still.
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable, Set
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from payroll_engine.models.inputs import WorkDay
from payroll_engine.money import ZERO, D
from payroll_engine.rules import ResolvedRules

HOURS_RULE = "labor.hours"


@dataclass(frozen=True)
class HoursRules:
    daily_regular: Decimal
    night_daily_regular: Decimal
    weekly_limit: Decimal
    first_overtime_hours: Decimal


@dataclass(frozen=True)
class HourBuckets:
    regular: Decimal = ZERO
    overtime_first: Decimal = ZERO
    overtime_after: Decimal = ZERO
    rest_day: Decimal = ZERO
    rest_overtime_first: Decimal = ZERO
    rest_overtime_after: Decimal = ZERO


def hours_rules(rules: ResolvedRules, work_week: int) -> HoursRules:
    cfg = rules.value(HOURS_RULE)
    return HoursRules(
        daily_regular=D(cfg["daily_regular"][str(work_week)]),
        night_daily_regular=D(cfg["night_daily_regular"]),
        weekly_limit=D(cfg["weekly_limit"]),
        first_overtime_hours=D(cfg["first_overtime_hours"]),
    )


def week_start(day: date) -> date:
    """The Sunday that starts the Israeli work week containing `day`."""
    return day - timedelta(days=(day.weekday() + 1) % 7)


def classify(
    days: Iterable[WorkDay], rules: HoursRules, holidays: Set[date] = frozenset()
) -> HourBuckets:
    seen: set[date] = set()
    weekly_regular: defaultdict[date, Decimal] = defaultdict(lambda: ZERO)
    ot_first = ot_after = rest = rest_first = rest_after = ZERO

    for wd in days:
        if wd.day in seen:
            raise ValueError(f"timesheet has two entries for {wd.day}")
        seen.add(wd.day)
        if wd.hours < ZERO:
            raise ValueError(f"negative hours on {wd.day}")

        limit = rules.night_daily_regular if wd.night else rules.daily_regular
        regular = min(wd.hours, limit)
        extra = wd.hours - regular
        first = min(extra, rules.first_overtime_hours)
        after = extra - first

        if wd.rest_day or wd.day in holidays:
            rest += regular
            rest_first += first
            rest_after += after
        else:
            weekly_regular[week_start(wd.day)] += regular
            ot_first += first
            ot_after += after

    regular_total = ZERO
    for hours in weekly_regular.values():
        excess = max(hours - rules.weekly_limit, ZERO)
        regular_total += hours - excess
        ot_first += excess

    return HourBuckets(regular_total, ot_first, ot_after, rest, rest_first, rest_after)
