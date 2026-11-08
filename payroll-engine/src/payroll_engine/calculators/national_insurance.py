"""Stage 7: National Insurance (Bituach Leumi) and health tax.

Two tiers: a reduced rate up to the reduced-rate threshold, a full rate from there up to the
ceiling. Income above the ceiling is not insured. Rates depend on the age category.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from payroll_engine.context import Context
from payroll_engine.dates import age_on
from payroll_engine.models.inputs import Employee, InsuranceCategory
from payroll_engine.models.payslip import Bases, NationalInsurance
from payroll_engine.money import ZERO, D, percent_of, round_agorot
from payroll_engine.rules import ResolvedRules

THRESHOLDS_RULE = "national_insurance.thresholds"
RATES_RULE = "national_insurance.rates"
AGES_RULE = "national_insurance.ages"


def category(employee: Employee, rules: ResolvedRules) -> InsuranceCategory:
    if employee.insurance_category is not None:
        return employee.insurance_category
    cfg = rules.value(AGES_RULE)
    age = age_on(employee.birth_date, rules.on)
    if age < cfg["adult_from_age"]:
        return InsuranceCategory.UNDER_18
    if age >= cfg["retirement_age"][employee.gender.value]:
        return InsuranceCategory.RETIREMENT_AGE
    return InsuranceCategory.STANDARD


def _two_tier(reduced_part: Decimal, full_part: Decimal, rates: Any) -> Decimal:
    return round_agorot(percent_of(reduced_part, D(rates["reduced"]))) + round_agorot(
        percent_of(full_part, D(rates["full"]))
    )


def run(ctx: Context, bases: Bases) -> NationalInsurance:
    limits = ctx.rules.value(THRESHOLDS_RULE)
    cat = category(ctx.employee, ctx.rules)
    rates = ctx.rules.value(RATES_RULE)[cat.value]

    insurable = max(bases.insurable, ZERO)
    reduced_up_to, ceiling = D(limits["reduced_up_to"]), D(limits["ceiling"])
    reduced_part = min(insurable, reduced_up_to)
    full_part = min(insurable, ceiling) - reduced_part

    result = NationalInsurance(
        category=cat,
        insurable=insurable,
        bl_employee=_two_tier(reduced_part, full_part, rates["employee_bl"]),
        health_employee=_two_tier(reduced_part, full_part, rates["employee_health"]),
        bl_employer=_two_tier(reduced_part, full_part, rates["employer_bl"]),
    )
    ctx.explain(
        "national_insurance.employee",
        f"National insurance + health ({cat.value})",
        "reduced_part x reduced% + full_part x full%",
        result.employee_total,
        insurable=insurable,
        reduced_part=reduced_part,
        full_part=full_part,
    )
    ctx.explain(
        "national_insurance.employer",
        "Employer national insurance",
        "reduced_part x reduced% + full_part x full%",
        result.bl_employer,
        insurable=insurable,
    )
    return result
