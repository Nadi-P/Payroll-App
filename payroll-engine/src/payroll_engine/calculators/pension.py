"""Stage 4: pension, severance and study-fund contributions, and taxable imputation of
employer deposits above the exempt ceilings."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from payroll_engine.context import Context
from payroll_engine.models.payslip import Contributions
from payroll_engine.money import ZERO, D, percent_of, round_agorot

MANDATORY_RULE = "pension.mandatory"
EXEMPTION_RULE = "pension.employer_exemption"
STUDY_FUND_RULE = "pension.study_fund"


def run(ctx: Context) -> tuple[Contributions, Decimal, Decimal]:
    """Returns contributions plus the pension and study-fund bases they were computed on."""
    pension_base = ctx.total(lambda c: c.pension_base)
    study_base = ctx.total(lambda c: c.study_fund_base)

    employee = employer = severance = study_employee = study_employer = ZERO
    extra = {
        "disability_employee": ZERO,
        "disability_employer": ZERO,
        "other_employee": ZERO,
        "other_employer": ZERO,
    }
    profile = ctx.employee.pension
    if profile is not None and pension_base > ZERO:
        defaults = ctx.rules.value(MANDATORY_RULE)
        employee = _contribution(ctx, "employee", pension_base, profile.employee_rate, defaults)
        employer = _contribution(ctx, "employer", pension_base, profile.employer_rate, defaults)
        severance = _contribution(ctx, "severance", pension_base, profile.severance_rate, defaults)
        _impute_pension(ctx, pension_base, employer, severance)
        for part in extra:
            rate = getattr(profile, f"{part}_rate")
            if rate > ZERO:
                extra[part] = round_agorot(percent_of(pension_base, rate))
                ctx.explain(
                    f"pension.{part}",
                    f"Fund deposit: {part.replace('_', ' ')}",
                    "base x rate%",
                    extra[part],
                    base=pension_base,
                    rate=rate,
                )

    study = ctx.employee.study_fund
    if study is not None and study_base > ZERO:
        study_employee = round_agorot(percent_of(study_base, study.employee_rate))
        study_employer = round_agorot(percent_of(study_base, study.employer_rate))
        ctx.explain(
            "pension.study_fund",
            "Study fund contributions",
            "base x employee_rate%, base x employer_rate%",
            study_employee + study_employer,
            base=study_base,
            employee_rate=study.employee_rate,
            employer_rate=study.employer_rate,
        )
        _impute_study_fund(ctx, study_base, study_employer)

    contributions = Contributions(
        employee, employer, severance, study_employee, study_employer, **extra
    )
    return contributions, pension_base, study_base


def _contribution(
    ctx: Context, part: str, base: Decimal, rate: Decimal | None, defaults: Any
) -> Decimal:
    effective_rate = rate if rate is not None else D(defaults[f"{part}_rate"])
    amount = round_agorot(percent_of(base, effective_rate))
    ctx.explain(
        f"pension.{part}",
        f"Pension {part} contribution",
        "base x rate%",
        amount,
        base=base,
        rate=effective_rate,
    )
    return amount


def _exempt_amount(base: Decimal, cap: Decimal, rate: Decimal) -> Decimal:
    return percent_of(min(base, cap), rate)


def _impute_pension(ctx: Context, base: Decimal, employer: Decimal, severance: Decimal) -> None:
    cfg = ctx.rules.value(EXEMPTION_RULE)
    pension_exempt = _exempt_amount(base, D(cfg["pension_salary_cap"]), D(cfg["pension_max_rate"]))
    ctx.add_line(
        "PENSION_IMPUTED",
        max(employer - pension_exempt, ZERO),
        formula="employer_deposit - rate% x min(base, salary_cap)",
        employer_deposit=employer,
        exempt=pension_exempt,
    )
    severance_exempt = _exempt_amount(
        base, D(cfg["severance_salary_cap"]), D(cfg["severance_max_rate"])
    )
    ctx.add_line(
        "SEVERANCE_IMPUTED",
        max(severance - severance_exempt, ZERO),
        formula="severance_deposit - rate% x min(base, salary_cap)",
        severance_deposit=severance,
        exempt=severance_exempt,
    )


def _impute_study_fund(ctx: Context, base: Decimal, employer: Decimal) -> None:
    cfg = ctx.rules.value(STUDY_FUND_RULE)
    exempt = _exempt_amount(base, D(cfg["salary_cap"]), D(cfg["employer_max_rate"]))
    ctx.add_line(
        "STUDY_FUND_IMPUTED",
        max(employer - exempt, ZERO),
        formula="employer_deposit - rate% x min(base, salary_cap)",
        employer_deposit=employer,
        exempt=exempt,
    )
