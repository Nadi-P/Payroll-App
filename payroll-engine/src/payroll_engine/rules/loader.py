"""Versioned, effective-dated rule data.

Rule file format (JSON):
    {"rule_id": "income_tax.brackets",
     "entries": [{"effective_from": "2025-01-01", "effective_to": null,
                  "source": "document + section", "verified": false, "value": {...}}]}
Decimal-looking JSON numbers are parsed as Decimal, never float.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any


class RuleError(ValueError):
    """Malformed or inconsistent rule data."""


class RuleNotFoundError(RuleError):
    """No rule entry is effective for the requested id and date."""


@dataclass(frozen=True)
class RuleEntry:
    rule_id: str
    effective_from: date
    effective_to: date | None
    source: str
    verified: bool
    value: Any

    def covers(self, on: date) -> bool:
        return self.effective_from <= on and (self.effective_to is None or on <= self.effective_to)


class ResolvedRules:
    """The rules in force on a single date."""

    def __init__(self, on: date, entries: dict[str, RuleEntry], version: str) -> None:
        self.on = on
        self.version = version
        self._entries = entries

    def entry(self, rule_id: str) -> RuleEntry:
        try:
            return self._entries[rule_id]
        except KeyError:
            raise RuleNotFoundError(f"no rule '{rule_id}' effective on {self.on}") from None

    def value(self, rule_id: str) -> Any:
        return self.entry(rule_id).value

    def unverified(self) -> tuple[str, ...]:
        return tuple(sorted(r for r, e in self._entries.items() if not e.verified))


class RuleSet:
    def __init__(self, entries: Iterable[RuleEntry], version: str = "unversioned") -> None:
        self.version = version
        self._by_id: dict[str, list[RuleEntry]] = {}
        for e in entries:
            self._by_id.setdefault(e.rule_id, []).append(e)
        for rule_id, group in self._by_id.items():
            group.sort(key=lambda e: e.effective_from)
            for prev, nxt in zip(group, group[1:], strict=False):
                if prev.effective_to is None or prev.effective_to >= nxt.effective_from:
                    raise RuleError(
                        f"overlapping entries for '{rule_id}': "
                        f"{prev.effective_from} and {nxt.effective_from}"
                    )

    def entries(self) -> tuple[RuleEntry, ...]:
        """Every version of every rule, ordered by rule id and then start date."""
        return tuple(e for rule_id in sorted(self._by_id) for e in self._by_id[rule_id])

    def at(self, on: date) -> ResolvedRules:
        resolved: dict[str, RuleEntry] = {}
        for rule_id, group in self._by_id.items():
            for e in group:
                if e.covers(on):
                    resolved[rule_id] = e
                    break
        return ResolvedRules(on, resolved, self.version)


def _parse_date(raw: Any, where: str) -> date:
    if not isinstance(raw, str):
        raise RuleError(f"{where}: date must be an ISO string, got {raw!r}")
    try:
        return date.fromisoformat(raw)
    except ValueError:
        raise RuleError(f"{where}: invalid date {raw!r}") from None


def _parse_file(path: Path, text: str) -> list[RuleEntry]:
    try:
        doc = json.loads(text, parse_float=Decimal)
    except json.JSONDecodeError as exc:
        raise RuleError(f"{path}: invalid JSON: {exc}") from None
    if not isinstance(doc, dict) or not isinstance(doc.get("rule_id"), str) or not doc["rule_id"]:
        raise RuleError(f"{path}: missing 'rule_id'")
    raw_entries = doc.get("entries")
    if not isinstance(raw_entries, list) or not raw_entries:
        raise RuleError(f"{path}: 'entries' must be a non-empty list")
    out: list[RuleEntry] = []
    for i, raw in enumerate(raw_entries):
        where = f"{path} entries[{i}]"
        if not isinstance(raw, dict):
            raise RuleError(f"{where}: must be an object")
        for key in ("effective_from", "source", "verified", "value"):
            if key not in raw:
                raise RuleError(f"{where}: missing '{key}'")
        if not isinstance(raw["source"], str) or not raw["source"].strip():
            raise RuleError(f"{where}: 'source' must be a non-empty string")
        if not isinstance(raw["verified"], bool):
            raise RuleError(f"{where}: 'verified' must be true or false")
        start = _parse_date(raw["effective_from"], where)
        end_raw = raw.get("effective_to")
        end = None if end_raw is None else _parse_date(end_raw, where)
        if end is not None and end < start:
            raise RuleError(f"{where}: effective_to is before effective_from")
        out.append(
            RuleEntry(doc["rule_id"], start, end, raw["source"], raw["verified"], raw["value"])
        )
    return out


def load_rules(root: Path) -> RuleSet:
    """Load every *.json under `root`. The version is a hash of all file contents."""
    files = sorted(p for p in root.rglob("*.json") if p.is_file())
    digest = hashlib.sha256()
    entries: list[RuleEntry] = []
    for path in files:
        data = path.read_bytes()
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(data)
        entries.extend(_parse_file(path, data.decode("utf-8")))
    return RuleSet(entries, version=digest.hexdigest()[:12])
