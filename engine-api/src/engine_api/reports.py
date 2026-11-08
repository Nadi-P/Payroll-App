"""The six base reports of Data history, as flat rows over every closed (approved) month.

Columns follow the Shiklulit base reports. Every row carries the same identity columns, so
the reports can be filtered and pivoted the same way. Money and quantities are decimals.
"""

from __future__ import annotations

from collections.abc import Callable, Iterator
from decimal import Decimal
from typing import Any

from engine_api.funds import split_contributions
from engine_api.models import EmployeeRecord, MonthEntry, MonthRecord, MonthStatus
from engine_api.payroll_service import company_catalog, work_days_of
from engine_api.store import DevStore, NotFoundError
from payroll_engine.components import ComponentKind
from payroll_engine.models import Payslip
from payroll_engine.money import round_agorot
from payroll_engine.rules import RuleSet

REPORTS = ("components", "imputed", "deductions", "costing", "funds", "absences")
ORGANIZATION_TAX = "UNION_FEE"
ADVANCE = "SALARY_ADVANCE"
ZERO = Decimal(0)

Row = dict[str, Any]


def _identity(company_name: str, record: EmployeeRecord | None, slip: Payslip) -> Row:
    p = slip.period
    profile = record.profile if record else None
    return {
        "year": p.year,
        "quarter": (p.month - 1) // 3 + 1,
        "half": 1 if p.month <= 6 else 2,
        "month": p.month,
        "employee_number": slip.employee_id,
        "employee_name": f"{profile.first_name} {profile.last_name}"
        if profile
        else slip.employee_id,
        "national_id": profile.national_id if profile else "",
        "department": profile.department if profile else "",
        "sub_department": profile.sub_department if profile else "",
        "company_name": company_name,
    }


def _months(store: DevStore, company_id: str) -> Iterator[MonthRecord]:
    yield from sorted(
        (m for m in store.months(company_id) if m.status == MonthStatus.APPROVED),
        key=lambda m: m.period,
    )


def _standing_codes(record: EmployeeRecord | None, entry: MonthEntry, slip: Payslip) -> set[str]:
    """Codes that came from the employee's standing terms (not typed this month)."""
    if record is None:
        return set()
    typed = {x.code for x in entry.lines} | {x.code for x in entry.deductions}
    return {s.code for s in record.standing if s.applies(slip.period) and s.code not in typed}


def _hours(entry: MonthEntry) -> Decimal:
    if entry.hours_total is not None:
        return entry.hours_total
    return sum((w.hours for w in entry.timesheet), ZERO)


def _days(record: EmployeeRecord | None, entry: MonthEntry, slip: Payslip, rules: RuleSet) -> int:
    if entry.allowances.attendance_days is not None:
        return entry.allowances.attendance_days
    if entry.timesheet:
        return sum(1 for w in entry.timesheet if w.hours > 0)
    if record is None:
        return 0
    absent = slip.balances.vacation_used + slip.balances.sick_used + slip.balances.reserve_days
    return max(len(work_days_of(record, slip.period, rules)) - int(absent), 0)


def build(store: DevStore, rules: RuleSet, company_id: str, report: str) -> list[Row]:
    if report not in REPORTS:
        raise NotFoundError(f"report {report}")
    company = store.company(company_id)
    records = {r.employee.employee_id: r for r in store.employees(company_id)}
    rows: list[Row] = []
    latest: dict[str, Payslip] = {}  # each employee's latest payslip: the "last balance"
    year_first: dict[tuple[str, int], Payslip] = {}  # first payslip of each work year

    for month in _months(store, company_id):
        entries = {e.employee_id: e.entry for e in month.entries}
        catalog = company_catalog(store, rules, company_id, month.period.last_day)
        for slip in month.approved:
            record = records.get(slip.employee_id)
            entry = entries.get(slip.employee_id, MonthEntry())
            base = _identity(company.name, record, slip)
            latest[slip.employee_id] = slip
            year_first.setdefault((slip.employee_id, slip.period.year), slip)
            make = BUILDERS[report]
            rows.extend(make(base, slip, record, entry, catalog, rules))

    if report == "absences":
        for row in rows:
            last = latest[row["employee_number"]].balances
            first = year_first[(row["employee_number"], row["year"])].balances
            row["vacation_year_opening"] = first.vacation_opening
            row["vacation_latest"] = last.vacation
            row["sick_year_opening"] = first.sick_opening
            row["sick_latest"] = last.sick
            row["recuperation_year_opening"] = first.recuperation_opening
            row["recuperation_latest"] = last.recuperation
    return rows


def _lines(kind: ComponentKind) -> Callable[..., list[Row]]:
    def make(
        base: Row,
        slip: Payslip,
        record: EmployeeRecord | None,
        entry: MonthEntry,
        catalog: Any,
        rules: RuleSet,
    ) -> list[Row]:
        standing = _standing_codes(record, entry, slip)
        return [
            {
                **base,
                "code": line.code,
                "rate": line.rate,
                "quantity": line.quantity,
                "total": line.amount,
                "standing": line.code in standing,
            }
            for line in slip.lines
            if line.kind is kind
        ]

    return make


def _deductions(
    base: Row,
    slip: Payslip,
    record: EmployeeRecord | None,
    entry: MonthEntry,
    catalog: Any,
    rules: RuleSet,
) -> list[Row]:
    standing = _standing_codes(record, entry, slip)
    return [
        {
            **base,
            "code": d.code,
            "rate": None,
            "quantity": None,
            "total": d.applied,
            "standing": d.code in standing,
        }
        for d in slip.deductions
        if d.applied != 0
    ]


def _costing(
    base: Row,
    slip: Payslip,
    record: EmployeeRecord | None,
    entry: MonthEntry,
    catalog: Any,
    rules: RuleSet,
) -> list[Row]:
    resolved = rules.at(slip.period.last_day)
    ni, c, b = slip.national_insurance, slip.contributions, slip.balances
    applied = {d.code: d.applied for d in slip.deductions}
    work_week = record.employee.work_week if record else 5
    divisor = Decimal(str(resolved.value("labor.vacation")["redemption_divisor"][str(work_week)]))
    full_rate = Decimal(str(resolved.value("termination.severance")["full_rate"]))
    day_value = Decimal(str(resolved.value("labor.recuperation")["day_value"]))
    return [
        {
            **base,
            "gross": slip.bases.gross_cash,
            "bl_employee": ni.bl_employee + ni.health_employee,
            "income_tax": slip.income_tax.tax,
            "funds_employee": c.employee_total,
            "voluntary_deductions": sum((d.applied for d in slip.deductions), ZERO),
            "net": slip.net_pay,
            "bl_employer": ni.bl_employer,
            "funds_employer": c.employer_total,
            # Reserves are accounting estimates of what this month adds to the employer's debt.
            "severance_reserve": max(
                round_agorot(slip.bases.severance * full_rate / 100) - c.severance_employer, ZERO
            ),
            "vacation_reserve": round_agorot(b.vacation_accrued * slip.bases.severance / divisor),
            "recuperation_reserve": round_agorot(b.recuperation_accrued * day_value),
            "employer_cost": slip.employer_cost,
            "bl_foreign_exemption": ZERO,  # the non-resident rule is not applied by the engine yet
            "organization_tax": applied.get(ORGANIZATION_TAX, ZERO),
            "advance": applied.get(ADVANCE, ZERO),
            "hours": _hours(entry),
            "days": _days(record, entry, slip, rules),
        }
    ]


def _funds(
    base: Row,
    slip: Payslip,
    record: EmployeeRecord | None,
    entry: MonthEntry,
    catalog: Any,
    rules: RuleSet,
) -> list[Row]:
    if record is None or not record.funds:
        return []
    days = _days(record, entry, slip, rules)
    rows = []
    for fund, part in zip(
        record.funds, split_contributions(slip, record.funds, rules), strict=True
    ):
        employee = (
            part.get("employee", ZERO)
            + part.get("disability_employee", ZERO)
            + part.get("other_employee", ZERO)
        )
        employer = (
            part.get("employer", ZERO)
            + part.get("disability_employer", ZERO)
            + part.get("other_employer", ZERO)
            + part.get("severance", ZERO)
        )
        if employee == 0 and employer == 0:
            continue
        rows.append(
            {
                **base,
                "fund_code": fund.code,
                "fund_name": fund.name,
                "fund_kind": fund.kind,
                "fund_salary": part.get("salary", ZERO),
                "fund_employee": part.get("employee", ZERO),
                "disability_employee": part.get("disability_employee", ZERO),
                "other_employee": part.get("other_employee", ZERO),
                "total_employee": employee,
                "fund_employer": part.get("employer", ZERO),
                "disability_employer": part.get("disability_employer", ZERO),
                "other_employer": part.get("other_employer", ZERO),
                "severance": part.get("severance", ZERO),
                "total_employer": employer,
                "total": employee + employer,
                "member_number": fund.member_number,
                "branch": fund.branch,
                "work_days": days,
                "amounts_ref": fund.amounts_ref,
                "group": fund.group,
            }
        )
    return rows


def _absences(
    base: Row,
    slip: Payslip,
    record: EmployeeRecord | None,
    entry: MonthEntry,
    catalog: Any,
    rules: RuleSet,
) -> list[Row]:
    b = slip.balances
    return [
        {
            **base,
            "calendar_month": slip.period.month,
            "vacation_code": "VAC",
            "vacation_adjustment": b.vacation_adjustment,
            "vacation_previous": b.vacation_opening,
            "vacation_accrued": b.vacation_accrued,
            "vacation_used": b.vacation_used,
            "vacation_balance": b.vacation,
            "sick_code": "SICK",
            "sick_adjustment": b.sick_adjustment,
            "sick_previous": b.sick_opening,
            "sick_accrued": b.sick_accrued,
            "sick_used": b.sick_used,
            "sick_balance": b.sick,
            "recuperation_code": "RECUP",
            "recuperation_adjustment": b.recuperation_adjustment,
            "recuperation_previous": b.recuperation_opening,
            "recuperation_accrued": b.recuperation_accrued,
            "recuperation_used": b.recuperation_used,
            "recuperation_balance": b.recuperation,
            "reserve_used": b.reserve_days,
        }
    ]


BUILDERS: dict[str, Callable[..., list[Row]]] = {
    "components": _lines(ComponentKind.EARNING),
    "imputed": _lines(ComponentKind.BENEFIT),
    "deductions": _deductions,
    "costing": _costing,
    "funds": _funds,
    "absences": _absences,
}
