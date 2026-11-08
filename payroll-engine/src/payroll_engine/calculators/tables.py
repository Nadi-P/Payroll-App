"""Lookups over the step tables used in rule data."""

from __future__ import annotations

from collections.abc import Sequence
from decimal import Decimal
from typing import Any

from payroll_engine.money import ZERO, D
from payroll_engine.rules import RuleError


def step_value(table: Sequence[Any], key: str, at: int, field: str) -> Decimal:
    """Value of the last row whose `key` is <= `at` (rows sorted ascending by `key`)."""
    result: Decimal | None = None
    for row in table:
        if row[key] > at:
            break
        result = D(row[field])
    if result is None:
        raise RuleError(f"no table row with {key} <= {at}")
    return result


def range_value(table: Sequence[Any], at: int, field: str) -> Decimal:
    """Value of the row with from_age <= `at` <= to_age, or zero when none matches."""
    for row in table:
        if row["from_age"] <= at <= row["to_age"]:
            return D(row[field])
    return ZERO
