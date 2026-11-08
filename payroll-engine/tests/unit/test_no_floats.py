"""Build guard: binary floats must never appear in the engine source."""

import ast
from pathlib import Path

SRC = Path(__file__).resolve().parents[2] / "src" / "payroll_engine"


def test_no_float_names_or_literals_in_engine() -> None:
    offences: list[str] = []
    for path in SRC.rglob("*.py"):
        for node in ast.walk(ast.parse(path.read_text("utf-8"))):
            if isinstance(node, ast.Name) and node.id == "float":
                offences.append(f"{path.name}:{node.lineno} uses 'float'")
            elif isinstance(node, ast.Constant) and isinstance(node.value, float):
                offences.append(f"{path.name}:{node.lineno} float literal {node.value}")
    assert not offences, "\n".join(offences)
