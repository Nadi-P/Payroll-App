"""Stage 6: income tax withholding.

Order of precedence: fixed rate > tax coordination > secondary job > regular brackets.
Regular brackets run monthly or cumulatively (year to date) per employer settings.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from decimal import Decimal

from payroll_engine.calculators.tables import range_value
from payroll_engine.context import Context
from payroll_engine.models.inputs import Employee, Gender, TaxBracket, TaxMethod
from payroll_engine.models.payslip import Bases, Contributions, IncomeTax
from payroll_engine.money import HUNDRED, ZERO, D, percent_of, round_agorot
from payroll_engine.rules import ResolvedRules

BRACKETS_RULE = "income_tax.brackets"
SURTAX_RULE = "income_tax.surtax"
POINT_VALUE_RULE = "income_tax.credit_point_value"
POINTS_RULE = "income_tax.credit_points"
SECONDARY_RULE = "income_tax.secondary_job"
PENSION_CREDIT_RULE = "income_tax.pension_credit"


def brackets(rules: ResolvedRules) -> tuple[TaxBracket, ...]:
    return tuple(
        TaxBracket(None if row["up_to"] is None else D(row["up_to"]), D(row["rate"]))
        for row in rules.value(BRACKETS_RULE)["monthly"]
    )


def bracket_tax(income: Decimal, table: Sequence[TaxBracket], months: int = 1) -> Decimal:
    """Progressive tax on `income` with monthly brackets scaled to `months` months."""
    tax = ZERO
    lower = ZERO
    for bracket in table:
        if income <= lower:
            break
        upper = None if bracket.up_to is None else bracket.up_to * months
        portion = income - lower if upper is None else min(income, upper) - lower
        tax += portion * bracket.rate / HUNDRED
        if upper is None:
            break
        lower = upper
    return tax


def surtax(income: Decimal, rules: ResolvedRules, months: int = 1) -> Decimal:
    cfg = rules.value(SURTAX_RULE)
    threshold = D(cfg["monthly_threshold"]) * months
    return percent_of(max(income - threshold, ZERO), D(cfg["rate"]))


def credit_points(employee: Employee, on: date, rules: ResolvedRules) -> Decimal:
    """Credit points from Form 101 data in force on `on`."""
    profile = employee.tax
    cfg = rules.value(POINTS_RULE)
    points = ZERO
    if profile.resident:
        points += D(cfg["resident"])
        if employee.gender is Gender.FEMALE:
            points += D(cfg["woman"])
    parent = "mother" if employee.gender is Gender.FEMALE else "father"
    for child in profile.children:
        # Child points follow the age reached during the tax year.
        points += range_value(cfg["children"][parent], on.year - child.birth_date.year, "points")
    points += sum((c.points for c in profile.claims if c.applies(on)), ZERO)
    return points


def pension_credit(
    contributions: Contributions, pension_base: Decimal, rules: ResolvedRules
) -> Decimal:
    """Section 45A credit on the employee's own pension contribution."""
    cfg = rules.value(PENSION_CREDIT_RULE)
    insured = min(pension_base, D(cfg["insured_salary_ceiling"]))
    eligible = min(
        contributions.pension_employee, percent_of(insured, D(cfg["max_contribution_rate"]))
    )
    return percent_of(eligible, D(cfg["credit_rate"]))


def run(ctx: Context, bases: Bases, contributions: Contributions) -> IncomeTax:
    rules, profile = ctx.rules, ctx.employee.tax
    taxable = bases.taxable
    point_value = D(rules.value(POINT_VALUE_RULE)["monthly"])
    p_credit = round_agorot(pension_credit(contributions, bases.pension, rules))

    gross_tax = extra = points = ZERO
    if profile.fixed_rate is not None:
        gross_tax, p_credit, method = percent_of(taxable, profile.fixed_rate), ZERO, "fixed rate"
    elif profile.coordination is not None:
        gross_tax = bracket_tax(taxable, profile.coordination.brackets)
        points, method = profile.coordination.credit_points, "tax coordination"
    elif not profile.main_employer:
        gross_tax = percent_of(taxable, D(rules.value(SECONDARY_RULE)["rate"]))
        method = "secondary job"
    else:
        points = credit_points(ctx.employee, ctx.period.last_day, rules)
        if ctx.inp.settings.tax_method is TaxMethod.CUMULATIVE:
            return _cumulative(ctx, taxable, points, point_value, p_credit)
        gross_tax = bracket_tax(taxable, brackets(rules))
        extra = surtax(taxable, rules)
        method = "monthly brackets"

    points_amount = round_agorot(points * point_value)
    tax = round_agorot(max(gross_tax + extra - points_amount - p_credit, ZERO))
    ctx.explain(
        "income_tax.withholding",
        f"Income tax ({method})",
        "max(bracket_tax + surtax - credit_points x point_value - pension_credit, 0)",
        tax,
        taxable=taxable,
        bracket_tax=round_agorot(gross_tax),
        surtax=round_agorot(extra),
        credit_points=points,
        point_value=point_value,
        pension_credit=p_credit,
    )
    return IncomeTax(
        taxable, round_agorot(gross_tax), round_agorot(extra), points, points_amount, p_credit, tax
    )


def _cumulative(
    ctx: Context, taxable: Decimal, points: Decimal, point_value: Decimal, p_credit: Decimal
) -> IncomeTax:
    """Year-to-date method: tax on cumulative income minus cumulative credits minus tax already
    withheld. The result may be negative, which refunds over-withholding."""
    ytd = ctx.inp.ytd
    months = ytd.months + 1
    income = ytd.taxable_income + taxable
    gross_tax = bracket_tax(income, brackets(ctx.rules), months)
    extra = surtax(income, ctx.rules, months)
    points_amount = round_agorot(points * point_value)
    credits = ytd.credits + points_amount + p_credit
    due_to_date = max(gross_tax + extra - credits, ZERO)
    tax = round_agorot(due_to_date - ytd.tax_withheld)
    ctx.explain(
        "income_tax.withholding",
        "Income tax (cumulative)",
        "max(bracket_tax(ytd_income, months) + surtax - ytd_credits, 0) - ytd_withheld",
        tax,
        months=months,
        ytd_income=income,
        ytd_credits=credits,
        ytd_withheld=ytd.tax_withheld,
    )
    return IncomeTax(
        taxable, round_agorot(gross_tax), round_agorot(extra), points, points_amount, p_credit, tax
    )
