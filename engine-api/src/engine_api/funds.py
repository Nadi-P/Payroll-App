"""Provident fund enrollments: how they become the engine's pension and study-fund profiles,
and how a payslip's contribution totals split back into each fund."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import replace
from datetime import date
from decimal import Decimal

from engine_api.models import EmployeeRecord, FundEnrollment, FundKind
from payroll_engine.models import Payslip, PensionProfile, StudyFundProfile
from payroll_engine.money import round_agorot
from payroll_engine.rules import RuleSet

HUNDRED = Decimal(100)
PENSION_KINDS = (FundKind.PENSION, FundKind.MANAGERS_INSURANCE, FundKind.PROVIDENT)
PARTS = ("employee", "employer", "severance")
EXTRA_PARTS = ("disability_employee", "disability_employer", "other_employee", "other_employer")


def _statutory(rules: RuleSet, on: date) -> dict[str, Decimal]:
    cfg = rules.at(on).value("pension.mandatory")
    return {part: Decimal(str(cfg[f"{part}_rate"])) for part in PARTS}


def pension_rate(fund: FundEnrollment, part: str, statutory: dict[str, Decimal]) -> Decimal:
    rate = getattr(fund, f"{part}_rate")
    if rate is None:
        return statutory[part] if fund.kind in PENSION_KINDS else Decimal(0)
    return Decimal(rate)


def sync_funds(record: EmployeeRecord, rules: RuleSet, on: date | None = None) -> EmployeeRecord:
    """Set the engine's pension and study-fund profiles from the enrollments.

    A single pension fund on the full salary keeps its rates as they are (None = statutory);
    several funds combine into one rate per part, weighted by their salary share.
    """
    if not record.funds:
        return record
    statutory = _statutory(rules, on or date.today())
    pension_funds = [f for f in record.funds if f.kind in PENSION_KINDS]
    study_funds = [f for f in record.funds if f.kind is FundKind.STUDY_FUND]

    pension = None
    if pension_funds:
        if len(pension_funds) == 1 and pension_funds[0].salary_share == HUNDRED:
            only = pension_funds[0]
            rates: dict[str, Decimal | None] = {p: getattr(only, f"{p}_rate") for p in PARTS}
        else:
            rates = {
                p: sum(
                    (
                        pension_rate(f, p, statutory) * f.salary_share / HUNDRED
                        for f in pension_funds
                    ),
                    Decimal(0),
                )
                for p in PARTS
            }
        extras = {
            p: sum(
                (getattr(f, f"{p}_rate") * f.salary_share / HUNDRED for f in pension_funds),
                Decimal(0),
            )
            for p in EXTRA_PARTS
        }
        pension = PensionProfile(
            employee_rate=rates["employee"],
            employer_rate=rates["employer"],
            severance_rate=rates["severance"],
            disability_employee_rate=extras["disability_employee"],
            disability_employer_rate=extras["disability_employer"],
            other_employee_rate=extras["other_employee"],
            other_employer_rate=extras["other_employer"],
        )

    study = None
    if study_funds:
        study = StudyFundProfile(
            employee_rate=sum(
                (Decimal(f.employee_rate or 0) * f.salary_share / HUNDRED for f in study_funds),
                Decimal(0),
            ),
            employer_rate=sum(
                (Decimal(f.employer_rate or 0) * f.salary_share / HUNDRED for f in study_funds),
                Decimal(0),
            ),
        )
    return replace(record, employee=replace(record.employee, pension=pension, study_fund=study))


def _allocate(total: Decimal, weights: Sequence[Decimal]) -> list[Decimal]:
    """Split `total` by `weights` in agorot; the last share takes the rounding remainder."""
    whole = sum(weights, Decimal(0))
    if not weights:
        return []
    if whole == 0:
        return [Decimal(0)] * len(weights)
    out = [round_agorot(total * w / whole) for w in weights[:-1]]
    out.append(total - sum(out, Decimal(0)))
    return out


def split_contributions(
    slip: Payslip, funds: Sequence[FundEnrollment], rules: RuleSet
) -> list[dict[str, Decimal]]:
    """Each fund's part of the payslip's deposits. The parts add up to the payslip exactly."""
    statutory = _statutory(rules, slip.period.last_day)
    c = slip.contributions
    out: list[dict[str, Decimal]] = [{} for _ in funds]
    groups = (
        (
            [i for i, f in enumerate(funds) if f.kind in PENSION_KINDS],
            slip.bases.pension,
            {
                "employee": c.pension_employee,
                "employer": c.pension_employer,
                "severance": c.severance_employer,
                "disability_employee": c.disability_employee,
                "disability_employer": c.disability_employer,
                "other_employee": c.other_employee,
                "other_employer": c.other_employer,
            },
        ),
        (
            [i for i, f in enumerate(funds) if f.kind is FundKind.STUDY_FUND],
            slip.bases.study_fund,
            {"employee": c.study_fund_employee, "employer": c.study_fund_employer},
        ),
    )
    for members, base, totals in groups:
        for i in members:
            out[i]["salary"] = round_agorot(base * funds[i].salary_share / HUNDRED)
        for part, total in totals.items():
            weights = []
            for i in members:
                f = funds[i]
                rate = (
                    pension_rate(f, part, statutory)
                    if part in PARTS
                    else Decimal(getattr(f, f"{part}_rate"))
                )
                weights.append(rate * f.salary_share)
            for i, amount in zip(members, _allocate(total, weights), strict=True):
                out[i][part] = amount
    return out
