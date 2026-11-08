"""Israeli payroll calculation engine."""

from pathlib import Path

from payroll_engine.payroll import PayrollRun, run_payroll
from payroll_engine.pipeline import calculate
from payroll_engine.rules import RuleSet, load_rules

DEFAULT_RULES_DIR = Path(__file__).resolve().parents[2] / "rules"


def default_rules() -> RuleSet:
    """The rule data shipped with the engine (`payroll-engine/rules`)."""
    return load_rules(DEFAULT_RULES_DIR)


__all__ = [
    "DEFAULT_RULES_DIR",
    "PayrollRun",
    "calculate",
    "default_rules",
    "load_rules",
    "run_payroll",
]
