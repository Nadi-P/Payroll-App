from decimal import Decimal

import pytest

from payroll_engine.money import D, percent_of, round_agorot


def test_d_accepts_exact_types() -> None:
    assert D("1.10") == Decimal("1.10")
    assert D(5) == Decimal(5)
    assert D(Decimal("2.5")) == Decimal("2.5")


def test_d_rejects_binary_floats_and_bools() -> None:
    with pytest.raises(TypeError):
        D(0.1)  # type: ignore[arg-type]
    with pytest.raises(TypeError):
        D(True)


def test_round_agorot_is_half_up() -> None:
    assert round_agorot(Decimal("1.005")) == Decimal("1.01")
    assert round_agorot(Decimal("1.004")) == Decimal("1.00")
    assert round_agorot(Decimal("-1.005")) == Decimal("-1.01")


def test_percent_of_is_unrounded() -> None:
    assert percent_of(Decimal("100.00"), Decimal("6.5")) == Decimal("6.500")
    assert percent_of(Decimal("1"), Decimal("33.333")) == Decimal("0.33333")
