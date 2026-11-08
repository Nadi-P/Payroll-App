"""Command line:

python -m payroll_engine run INPUT.json [--rules DIR]       payslip as JSON
python -m payroll_engine unverified YYYY-MM-DD [--rules DIR]  rules awaiting verification
"""

from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

from payroll_engine import DEFAULT_RULES_DIR, calculate, load_rules
from payroll_engine.models.inputs import PayslipInput
from payroll_engine.serialization import dumps, from_dict, loads


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="payroll_engine")
    parser.add_argument("--rules", type=Path, default=DEFAULT_RULES_DIR)
    commands = parser.add_subparsers(dest="command", required=True)
    run = commands.add_parser("run", help="calculate a payslip from an input JSON file")
    run.add_argument("input", type=Path)
    unverified = commands.add_parser("unverified", help="list rules not yet verified")
    unverified.add_argument("on", type=date.fromisoformat)
    args = parser.parse_args(argv)

    rules = load_rules(args.rules)
    if args.command == "run":
        inp = from_dict(PayslipInput, loads(args.input.read_text("utf-8")))
        sys.stdout.write(dumps(calculate(inp, rules)) + "\n")
    else:
        resolved = rules.at(args.on)
        for rule_id in resolved.unverified():
            sys.stdout.write(f"{rule_id}\t{resolved.entry(rule_id).source}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
