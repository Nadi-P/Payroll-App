from decimal import Decimal
from pathlib import Path

import pytest

from payroll_engine import calculate
from payroll_engine.__main__ import main
from payroll_engine.models import PayslipInput
from payroll_engine.rules import RuleSet
from payroll_engine.serialization import SerializationError, dumps, from_dict, loads, to_jsonable
from tests.conftest import payslip_input

EXAMPLE = Path(__file__).resolve().parents[2] / "examples" / "monthly_employee.json"


def test_input_round_trip() -> None:
    inp = payslip_input()
    assert from_dict(PayslipInput, loads(dumps(inp))) == inp


def test_example_file_calculates(rules: RuleSet) -> None:
    inp = from_dict(PayslipInput, loads(EXAMPLE.read_text("utf-8")))
    slip = calculate(inp, rules)
    assert slip.net_pay > 0
    assert to_jsonable(slip)["net_pay"] == str(slip.net_pay)


@pytest.mark.parametrize(
    "patch",
    [
        {"employee": {"birth_date": "not-a-date"}},
        {"employee": {"monthly_salary": True}},
        {"employee": {"unknown": 1}},
        {"employee": {"gender": "other"}},
    ],
)
def test_bad_input_is_rejected(patch: dict[str, dict[str, object]]) -> None:
    data = loads(dumps(payslip_input()))
    data["employee"].update(patch["employee"])
    with pytest.raises(SerializationError):
        from_dict(PayslipInput, data)


def test_decimal_numbers_parse_exactly() -> None:
    assert loads('{"a": 0.1}')["a"] == Decimal("0.1")


def test_cli_run_and_unverified(capsys: pytest.CaptureFixture[str]) -> None:
    assert main(["run", str(EXAMPLE)]) == 0
    assert '"net_pay"' in capsys.readouterr().out
    assert main(["unverified", "2026-01-31"]) == 0
    assert "income_tax.brackets" in capsys.readouterr().out
