"""Decimal-only money helpers. All rounding in the engine goes through this module."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Final

ZERO: Final = Decimal("0")
HUNDRED: Final = Decimal("100")
AGORA: Final = Decimal("0.01")


def D(value: Decimal | int | str) -> Decimal:
    """Build a Decimal from an exact source. Binary floats and bools are rejected."""
    if isinstance(value, bool) or not isinstance(value, Decimal | int | str):
        raise TypeError(f"D() accepts Decimal, int or str, got {type(value).__name__}")
    return Decimal(value)


def round_agorot(amount: Decimal) -> Decimal:
    """Round to whole agorot (0.01), half up."""
    return amount.quantize(AGORA, rounding=ROUND_HALF_UP)


def percent_of(amount: Decimal, rate_percent: Decimal) -> Decimal:
    """Unrounded `rate_percent`% of `amount`. Callers decide where to round."""
    return amount * rate_percent / HUNDRED
