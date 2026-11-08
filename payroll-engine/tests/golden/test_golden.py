"""Golden tests from real (anonymized) payslips.

Each case is a folder under tests/golden/cases/<name>/ holding:
  input.json     a PayslipInput (same format as examples/monthly_employee.json)
  expected.json  the figures printed on the real payslip, e.g.
                 {"net_pay": "8816.44", "income_tax.tax": "575.10",
                  "national_insurance.bl_employee": "240.90", "lines.BASE_SALARY": "10000.00"}
Every listed figure must match to the agora.
"""

from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from payroll_engine import calculate
from payroll_engine.models import Payslip, PayslipInput
from payroll_engine.serialization import from_dict, loads
from tests.conftest import RULES

CASES = sorted(p for p in (Path(__file__).parent / "cases").glob("*") if p.is_dir())


def _figure(slip: Payslip, path: str) -> Decimal:
    if path.startswith("lines."):
        return slip.line(path.removeprefix("lines."))
    value: Any = slip
    for part in path.split("."):
        value = getattr(value, part)
    return Decimal(value)


@pytest.mark.skipif(not CASES, reason="no golden payslips yet")
@pytest.mark.parametrize("case", CASES, ids=lambda p: p.name)
def test_golden_payslip(case: Path) -> None:
    inp = from_dict(PayslipInput, loads((case / "input.json").read_text("utf-8")))
    expected = loads((case / "expected.json").read_text("utf-8"))
    slip = calculate(inp, RULES)
    mismatches = {
        path: (str(_figure(slip, path)), str(want))
        for path, want in expected.items()
        if _figure(slip, path) != Decimal(want)
    }
    assert not mismatches, f"(got, expected): {mismatches}"
