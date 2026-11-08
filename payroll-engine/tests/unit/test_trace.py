from decimal import Decimal

from payroll_engine.models import Trace, TraceEntry


def _entry(rule_id: str) -> TraceEntry:
    return TraceEntry(rule_id, "d", "a*b", (("a", "1"),), Decimal("1"), "v1")


def test_trace_is_immutable_and_filterable() -> None:
    t0 = Trace()
    t1 = t0.add(_entry("r1")).add(_entry("r2")).add(_entry("r1"))
    assert t0.entries == ()
    assert len(t1.entries) == 3
    assert len(t1.for_rule("r1")) == 2
