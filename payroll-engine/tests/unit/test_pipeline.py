from datetime import date
from decimal import Decimal

import pytest

from payroll_engine import calculate
from payroll_engine.components import UnknownComponentError
from payroll_engine.dates import Period
from payroll_engine.models import (
    Allowances,
    Deduction,
    EmployerSettings,
    EmploymentKind,
    InsuranceCategory,
    PayLine,
    PensionProfile,
    StudyFundProfile,
    TaxMethod,
    TaxProfile,
    WorkDay,
    YearToDate,
)
from payroll_engine.rules import RuleSet
from tests.conftest import employee, payslip_input


def codes(slip: object) -> set[str]:
    return {line.code for line in slip.lines}  # type: ignore[attr-defined]


def test_basic_monthly_employee_2026(rules: RuleSet) -> None:
    slip = calculate(payslip_input(), rules)
    assert slip.bases.gross_cash == Decimal("10000.00")
    assert slip.income_tax.tax == Decimal("575.10")  # 1119.60 - 2.25 x 242
    assert slip.national_insurance.bl_employee == Decimal("240.90")
    assert slip.national_insurance.health_employee == Decimal("367.56")
    assert slip.national_insurance.bl_employer == Decimal("521.98")
    assert slip.net_pay == Decimal("8816.44")
    assert slip.employer_cost == Decimal("10521.98")
    assert "PENSION_MISSING" in {f.code for f in slip.flags}


def test_pension_contributions_and_credit(rules: RuleSet) -> None:
    slip = calculate(payslip_input(employee(pension=PensionProfile())), rules)
    c = slip.contributions
    assert (c.pension_employee, c.pension_employer, c.severance_employer) == (
        Decimal("600.00"),
        Decimal("650.00"),
        Decimal("600.00"),
    )
    assert slip.income_tax.pension_credit == Decimal("210.00")
    assert slip.income_tax.tax == Decimal("365.10")
    assert slip.net_pay == Decimal("8426.44")
    assert slip.employer_cost == Decimal("11771.98")
    assert "PENSION_IMPUTED" not in codes(slip)


def test_high_salary_imputes_employer_deposits(rules: RuleSet) -> None:
    emp = employee(
        monthly_salary=Decimal("50000"),
        pension=PensionProfile(),
        study_fund=StudyFundProfile(Decimal("2.5"), Decimal("7.5")),
    )
    slip = calculate(payslip_input(emp), rules)
    # pension: 6.5% x 50000 = 3250, exempt 7.5% x 34423 = 2581.725
    assert slip.line("PENSION_IMPUTED") == Decimal("668.28")
    # study fund: 7.5% x 50000 = 3750, exempt 7.5% x 15712 = 1178.40
    assert slip.line("STUDY_FUND_IMPUTED") == Decimal("2571.60")
    assert slip.bases.taxable == Decimal("50000") + Decimal("668.28") + Decimal("2571.60")
    assert slip.bases.gross_cash == Decimal("50000.00")


def test_partial_month_by_work_days(rules: RuleSet) -> None:
    slip = calculate(payslip_input(employee(start_date=date(2026, 1, 15))), rules)
    assert slip.line("BASE_SALARY") == Decimal("5238.10")  # 11 of 21 work days


def test_partial_month_by_calendar_days(rules: RuleSet) -> None:
    from payroll_engine.models import Proration

    inp = payslip_input(
        employee(start_date=date(2026, 1, 15)),
        settings=EmployerSettings(proration=Proration.CALENDAR_DAYS, recuperation_month=7),
    )
    assert calculate(inp, rules).line("BASE_SALARY") == Decimal("5483.87")  # 17 of 31 days


def test_hourly_employee_with_overtime_and_rest_day(rules: RuleSet) -> None:
    week = tuple(WorkDay(date(2026, 1, d), Decimal("9")) for d in range(4, 9))
    saturday = WorkDay(date(2026, 1, 10), Decimal("10"), rest_day=True)
    emp = employee(kind=EmploymentKind.HOURLY, monthly_salary=None, hourly_rate=Decimal("50"))
    slip = calculate(payslip_input(emp, timesheet=week + (saturday,)), rules)
    assert slip.line("HOURLY_PAY") == Decimal("2100.00")
    assert slip.line("OVERTIME_125") == Decimal("187.50")
    assert slip.line("REST_DAY_150") == Decimal("645.00")
    assert slip.line("REST_DAY_175") == Decimal("122.50")


def test_monthly_employee_overtime_uses_divisor(rules: RuleSet) -> None:
    day = WorkDay(date(2026, 1, 4), Decimal("10.6"))
    slip = calculate(payslip_input(timesheet=(day,)), rules)
    # 2 hours x (10000 / 182) x 125%
    assert slip.line("OVERTIME_125") == Decimal("137.36")
    assert "HOURLY_PAY" not in codes(slip)


def test_cumulative_method_matches_monthly_for_steady_salary(rules: RuleSet) -> None:
    inp = payslip_input(
        period=Period(2026, 2),
        settings=EmployerSettings(tax_method=TaxMethod.CUMULATIVE, recuperation_month=7),
        ytd=YearToDate(1, Decimal("10000"), Decimal("575.10"), Decimal("544.50")),
    )
    assert calculate(inp, rules).income_tax.tax == Decimal("575.10")


def test_cumulative_method_refunds_over_withholding(rules: RuleSet) -> None:
    inp = payslip_input(
        period=Period(2026, 2),
        settings=EmployerSettings(tax_method=TaxMethod.CUMULATIVE, recuperation_month=7),
        ytd=YearToDate(1, Decimal("10000"), Decimal("1575.10"), Decimal("544.50")),
    )
    slip = calculate(inp, rules)
    assert slip.income_tax.tax == Decimal("-424.90")
    assert "TAX_REFUND" in {f.code for f in slip.flags}


def test_secondary_job_and_fixed_rate(rules: RuleSet) -> None:
    secondary = calculate(payslip_input(employee(tax=TaxProfile(main_employer=False))), rules)
    assert secondary.income_tax.tax == Decimal("4700.00")
    fixed = calculate(payslip_input(employee(tax=TaxProfile(fixed_rate=Decimal("10")))), rules)
    assert fixed.income_tax.tax == Decimal("1000.00")


def test_allowances_and_benefits(rules: RuleSet) -> None:
    inp = payslip_input(
        allowances=Allowances(
            travel_daily_cost=Decimal("30"),
            attendance_days=20,
            car_list_price=Decimal("200000"),
            car_type="hybrid",
            mobile_phone=True,
        ),
        lines=(PayLine("BONUS", Decimal("1000")),),
    )
    slip = calculate(inp, rules)
    assert slip.line("TRAVEL") == Decimal("452.00")  # capped at 22.60 x 20
    assert slip.line("CAR_BENEFIT") == Decimal("4400.00")  # 2.48% x 200000 - 560
    assert slip.line("PHONE_BENEFIT") == Decimal("105.00")
    assert slip.bases.gross_cash == Decimal("11452.00")
    assert slip.bases.benefits == Decimal("4505.00")


def test_recuperation_spread_monthly(rules: RuleSet) -> None:
    inp = payslip_input(settings=EmployerSettings())
    # 6 completed years -> 7 days x 418 / 12 (2026-01 uses the 2025 day value)
    assert calculate(inp, rules).line("RECUPERATION") == Decimal("243.83")


def test_deductions_respect_priority_and_available_net(rules: RuleSet) -> None:
    inp = payslip_input(
        deductions=(
            Deduction("GARNISHMENT", Decimal("9000"), priority=50),
            Deduction("UNION_FEE", Decimal("100"), priority=10),
        )
    )
    slip = calculate(inp, rules)
    union, garnishment = slip.deductions
    assert (union.code, union.applied) == ("UNION_FEE", Decimal("100.00"))
    assert garnishment.applied == Decimal("8716.44")
    assert garnishment.unapplied == Decimal("283.56")
    assert slip.net_pay == 0
    assert "DEDUCTIONS_NOT_APPLIED" in {f.code for f in slip.flags}


def test_under_18_pays_no_employee_insurance(rules: RuleSet) -> None:
    slip = calculate(payslip_input(employee(birth_date=date(2010, 1, 1))), rules)
    assert slip.national_insurance.category is InsuranceCategory.UNDER_18
    assert slip.national_insurance.employee_total == 0


def test_minimum_wage_flag(rules: RuleSet) -> None:
    slip = calculate(payslip_input(employee(monthly_salary=Decimal("5000"))), rules)
    assert "BELOW_MINIMUM_WAGE" in {f.code for f in slip.flags}


def test_overtime_spike_flag(rules: RuleSet) -> None:
    quiet = calculate(payslip_input(), rules)
    busy_days = tuple(WorkDay(date(2026, 1, d), Decimal("12")) for d in range(4, 9))
    busy = calculate(payslip_input(timesheet=busy_days), rules, history=[quiet, quiet])
    assert "OVERTIME_SPIKE" in {f.code for f in busy.flags}


def test_unknown_component_and_misplaced_deduction(rules: RuleSet) -> None:
    with pytest.raises(UnknownComponentError):
        calculate(payslip_input(lines=(PayLine("NOPE", Decimal("1")),)), rules)
    with pytest.raises(ValueError):
        calculate(payslip_input(lines=(PayLine("UNION_FEE", Decimal("1")),)), rules)


def test_trace_explains_every_line(rules: RuleSet) -> None:
    slip = calculate(payslip_input(employee(pension=PensionProfile())), rules)
    traced = {e.rule_id for e in slip.trace.entries}
    assert all(f"line.{line.code}" in traced for line in slip.lines)
    assert "income_tax.withholding" in traced
    assert all(e.ruleset_version == slip.ruleset_version for e in slip.trace.entries)


def test_rules_of_the_period_are_used(rules: RuleSet) -> None:
    dec_2025 = calculate(payslip_input(period=Period(2025, 12)), rules)
    jan_2026 = calculate(payslip_input(), rules)
    assert dec_2025.national_insurance.employee_total != jan_2026.national_insurance.employee_total
