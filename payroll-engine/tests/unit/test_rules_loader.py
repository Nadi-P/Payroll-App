import json
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from payroll_engine.rules import RuleError, RuleNotFoundError, load_rules


def _write(root: Path, name: str, rule_id: str, entries: list[dict[str, Any]]) -> None:
    (root / name).write_text(json.dumps({"rule_id": rule_id, "entries": entries}), "utf-8")


def _entry(start: str, end: str | None, value: Any, verified: bool = True) -> dict[str, Any]:
    return {
        "effective_from": start,
        "effective_to": end,
        "source": "test",
        "verified": verified,
        "value": value,
    }


def test_mid_year_change_resolves_by_date(tmp_path: Path) -> None:
    _write(
        tmp_path,
        "rate.json",
        "x.rate",
        [_entry("2025-01-01", "2025-06-30", 5), _entry("2025-07-01", None, 7)],
    )
    rules = load_rules(tmp_path)
    assert rules.at(date(2025, 6, 30)).value("x.rate") == 5
    assert rules.at(date(2025, 7, 1)).value("x.rate") == 7
    assert rules.at(date(2030, 1, 1)).value("x.rate") == 7


def test_adding_a_file_changes_behaviour_without_code(tmp_path: Path) -> None:
    _write(tmp_path, "a.json", "x.rate", [_entry("2025-01-01", None, 5)])
    old = load_rules(tmp_path)
    _write(tmp_path, "a.json", "x.rate", [_entry("2025-01-01", "2025-12-31", 5)])
    _write(tmp_path, "b.json", "x.rate", [_entry("2026-01-01", None, 9)])
    new = load_rules(tmp_path)
    assert new.at(date(2026, 3, 1)).value("x.rate") == 9
    assert old.at(date(2026, 3, 1)).value("x.rate") == 5
    assert old.version != new.version


def test_decimals_not_floats(tmp_path: Path) -> None:
    (tmp_path / "r.json").write_text(
        '{"rule_id": "x.r", "entries": [{"effective_from": "2025-01-01", '
        '"source": "t", "verified": true, "value": {"rate": 0.0347}}]}',
        "utf-8",
    )
    value = load_rules(tmp_path).at(date(2025, 2, 1)).value("x.r")
    assert value["rate"] == Decimal("0.0347")
    assert isinstance(value["rate"], Decimal)


def test_missing_rule_raises(tmp_path: Path) -> None:
    _write(tmp_path, "r.json", "x.r", [_entry("2025-01-01", None, 1)])
    resolved = load_rules(tmp_path).at(date(2024, 12, 31))
    with pytest.raises(RuleNotFoundError):
        resolved.value("x.r")


def test_overlap_is_rejected(tmp_path: Path) -> None:
    _write(
        tmp_path,
        "r.json",
        "x.r",
        [_entry("2025-01-01", "2025-07-31", 1), _entry("2025-07-01", None, 2)],
    )
    with pytest.raises(RuleError, match="overlapping"):
        load_rules(tmp_path)


def test_open_ended_entry_followed_by_another_is_rejected(tmp_path: Path) -> None:
    _write(
        tmp_path, "r.json", "x.r", [_entry("2025-01-01", None, 1), _entry("2026-01-01", None, 2)]
    )
    with pytest.raises(RuleError, match="overlapping"):
        load_rules(tmp_path)


@pytest.mark.parametrize(
    "entry",
    [
        {"effective_from": "2025-01-01", "verified": True, "value": 1},  # no source
        {"effective_from": "2025-01-01", "source": " ", "verified": True, "value": 1},
        {"effective_from": "2025-13-01", "source": "t", "verified": True, "value": 1},
        {"effective_from": "2025-01-01", "source": "t", "verified": "yes", "value": 1},
        {
            "effective_from": "2025-02-01",
            "effective_to": "2025-01-01",
            "source": "t",
            "verified": True,
            "value": 1,
        },
    ],
)
def test_malformed_entries_are_rejected(tmp_path: Path, entry: dict[str, Any]) -> None:
    _write(tmp_path, "r.json", "x.r", [entry])
    with pytest.raises(RuleError):
        load_rules(tmp_path)


def test_unverified_values_are_reported(tmp_path: Path) -> None:
    _write(tmp_path, "a.json", "a.r", [_entry("2025-01-01", None, 1, verified=False)])
    _write(tmp_path, "b.json", "b.r", [_entry("2025-01-01", None, 1, verified=True)])
    assert load_rules(tmp_path).at(date(2025, 1, 1)).unverified() == ("a.r",)
