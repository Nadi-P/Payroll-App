"""Explainability: every computed line records the rule, inputs and formula behind it."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class TraceEntry:
    rule_id: str
    description: str
    formula: str
    inputs: tuple[tuple[str, str], ...]
    result: Decimal
    ruleset_version: str


@dataclass(frozen=True)
class Trace:
    entries: tuple[TraceEntry, ...] = ()

    def add(self, entry: TraceEntry) -> Trace:
        return Trace(self.entries + (entry,))

    def for_rule(self, rule_id: str) -> tuple[TraceEntry, ...]:
        return tuple(e for e in self.entries if e.rule_id == rule_id)
