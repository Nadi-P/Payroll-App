"""Builds engine inputs from stored records and runs the engine."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import replace
from datetime import date, timedelta
from decimal import ROUND_DOWN, Decimal

from engine_api.funds import sync_funds
from engine_api.models import (
    AnnualResult,
    CompanySummary,
    CorrectionDiff,
    EmployeeDiff,
    EmployeeEntry,
    EmployeeHours,
    EmployeeRecord,
    Liability,
    MonthEntry,
    MonthPreview,
    MonthRecord,
    MonthStatus,
    OpenMonths,
    PortfolioRow,
    PreviewRequest,
    Production,
    RunResult,
    TerminationRequest,
    YearData,
    YearMonth,
)
from engine_api.store import ConflictError, DevStore
from payroll_engine import calculate, run_payroll
from payroll_engine.annual import form102, reconcile_year
from payroll_engine.components import Catalog, ComponentKind
from payroll_engine.dates import Period, is_work_day
from payroll_engine.models import (
    Deduction,
    LeaveInputs,
    PayLine,
    Payslip,
    PayslipInput,
    Severity,
    SickDay,
    WorkDay,
    YearToDate,
)
from payroll_engine.models.trace import Trace
from payroll_engine.retro import diff
from payroll_engine.rules import RuleSet
from payroll_engine.termination import TerminationInput, TerminationResult, calculate_termination

HISTORY_MONTHS = 3
# A trust note on every payslip while some rule values await verification. It is shown once per
# screen, so it is not counted as a flag of each employee.
TRUST_NOTE = "UNVERIFIED_RULES"


def shift_period(period: Period, months: int) -> Period:
    index = period.year * 12 + (period.month - 1) + months
    return Period(index // 12, index % 12 + 1)


def employed_in(record: EmployeeRecord, period: Period) -> bool:
    emp = record.employee
    return emp.start_date <= period.last_day and (
        emp.end_date is None or emp.end_date >= period.first_day
    )


def _approved_before(store: DevStore, company_id: str, period: Period) -> list[MonthRecord]:
    return sorted(
        (m for m in store.months(company_id) if m.status == "approved" and m.period < period),
        key=lambda m: m.period,
    )


def _ytd(employee_id: str, period: Period, earlier: Sequence[MonthRecord]) -> YearToDate:
    slips = [
        p
        for m in earlier
        if m.period.year == period.year
        for p in m.approved
        if p.employee_id == employee_id
    ]
    return YearToDate(
        months=len(slips),
        taxable_income=sum((p.bases.taxable for p in slips), Decimal(0)),
        tax_withheld=sum((p.income_tax.tax for p in slips), Decimal(0)),
        credits=sum(
            (p.income_tax.credit_points_amount + p.income_tax.pension_credit for p in slips),
            Decimal(0),
        ),
    )


def work_days_of(record: EmployeeRecord, period: Period, rules: RuleSet) -> list[date]:
    """The days this employee is due to work this month: their work week, minus holidays."""
    emp = record.employee
    calendars = rules.at(period.last_day).value("calendar.holidays")
    listed = [*calendars.get("general", []), *calendars.get(emp.holiday_calendar, [])]
    holidays = {date.fromisoformat(h["date"]) for h in listed}
    start = max(period.first_day, emp.start_date)
    end = min(period.last_day, emp.end_date) if emp.end_date else period.last_day
    days = (start + timedelta(days=i) for i in range((end - start).days + 1))
    return [d for d in days if is_work_day(d, emp.work_week) and d not in holidays]


def _spread_hours(total: Decimal, days: Sequence[date]) -> tuple[WorkDay, ...]:
    """A monthly total as even work days, the rounding remainder going to the last one."""
    if not days or total <= 0:
        return ()
    each = (total / len(days)).quantize(Decimal("0.01"), ROUND_DOWN)
    rest = total - each * (len(days) - 1)
    return tuple(WorkDay(d, rest if d == days[-1] else each) for d in days)


def _resolve_days(
    record: EmployeeRecord, entry: MonthEntry, period: Period, rules: RuleSet
) -> tuple[tuple[WorkDay, ...], LeaveInputs]:
    """Turn the simple totals people type (hours, sick days) into the dated data the engine uses."""
    leave = entry.leave
    timesheet = entry.timesheet
    if entry.hours_total is None and not entry.sick_days_count:
        return timesheet, leave
    days = work_days_of(record, period, rules)
    if entry.sick_days_count and not leave.sick_days:
        sick = tuple(SickDay(d, i + 1) for i, d in enumerate(days[: entry.sick_days_count]))
        leave = replace(leave, sick_days=sick)
    sick_dates = {s.day for s in leave.sick_days}
    if entry.hours_total is not None and not timesheet:
        timesheet = _spread_hours(entry.hours_total, [d for d in days if d not in sick_dates])
    else:
        timesheet = tuple(w for w in timesheet if w.day not in sick_dates)
    return timesheet, leave


def _with_standing(
    record: EmployeeRecord, entry: MonthEntry, period: Period, catalog: Catalog
) -> tuple[tuple[PayLine, ...], tuple[Deduction, ...]]:
    """This month's lines plus the employee's standing ones; a value typed this month wins."""
    lines = list(entry.lines)
    deductions = list(entry.deductions)
    typed = {x.code for x in lines} | {x.code for x in deductions}
    for item in record.standing:
        if item.code in typed or not item.applies(period):
            continue
        if catalog.get(item.code).kind is ComponentKind.DEDUCTION:
            deductions.append(Deduction(item.code, item.amount))
        else:
            lines.append(PayLine(item.code, item.amount))
    return tuple(line for line in lines if line.amount != 0), tuple(
        d for d in deductions if d.amount != 0
    )


def company_catalog(store: DevStore, rules: RuleSet, company_id: str, on: date) -> Catalog:
    return Catalog.from_rules(rules.at(on)).extended(store.company(company_id).components)


def build_inputs(
    store: DevStore,
    rules: RuleSet,
    company_id: str,
    period: Period,
    override: PreviewRequest | None = None,
    only: str | None = None,
) -> list[PayslipInput]:
    """Engine inputs for everyone employed in the month. `override` tries unsaved changes on
    the employee `only` (both are used by the simulation preview)."""
    company = store.company(company_id)
    month = store.month(company_id, period)
    entries = {e.employee_id: e.entry for e in month.entries}
    earlier = _approved_before(store, company_id, period)
    catalog = company_catalog(store, rules, company_id, period.last_day)
    inputs = []
    for record in store.employees(company_id):
        emp_id = record.employee.employee_id
        if only is not None and emp_id != only:
            continue
        entry = entries.get(emp_id, MonthEntry())
        if override is not None:
            if override.record is not None:
                record = sync_funds(override.record, rules, period.last_day)
            if override.entry is not None:
                entry = override.entry
        if not employed_in(record, period):
            continue
        timesheet, leave = _resolve_days(record, entry, period, rules)
        if leave.reserve_days and leave.prior_three_months_gross is None:
            # Reserve-duty pay follows the last three months' gross: take it from closed months.
            prior = [p for m in earlier for p in m.approved if p.employee_id == emp_id][-3:]
            leave = replace(leave, prior_three_months_gross=sum((p.bases.gross_cash for p in prior), Decimal(0)))
        lines, deductions = _with_standing(record, entry, period, catalog)
        inputs.append(
            PayslipInput(
                employee=record.employee,
                period=period,
                settings=company.settings,
                lines=lines,
                timesheet=timesheet,
                leave=leave,
                allowances=entry.allowances,
                deductions=deductions,
                ytd=_ytd(emp_id, period, earlier),
                components=company.components,
            )
        )
    return inputs


def copy_previous_month(
    store: DevStore, rules: RuleSet, company_id: str, period: Period
) -> MonthRecord:
    """Start a month from the last one: same pay lines, hours and allowances; new dates."""
    previous = shift_period(period, -1)
    before = store.month(company_id, previous)
    if not before.entries:
        raise ConflictError("the previous month has nothing to copy")
    closing = {p.employee_id: p.balances for p in before.approved}
    copied = []
    for record in store.employees(company_id):
        emp_id = record.employee.employee_id
        old = next((e.entry for e in before.entries if e.employee_id == emp_id), None)
        if old is None or not employed_in(record, period):
            continue
        balances = closing.get(emp_id)
        hours = old.hours_total
        if hours is None and old.timesheet:
            hours = sum((w.hours for w in old.timesheet), Decimal(0))
        entry = MonthEntry(
            lines=old.lines,
            leave=LeaveInputs(
                vacation_opening=balances.vacation if balances else old.leave.vacation_opening,
                sick_opening=balances.sick if balances else old.leave.sick_opening,
            ),
            allowances=replace(old.allowances, attendance_days=None),
            deductions=old.deductions,
            hours_total=hours,
        )
        copied.append(EmployeeEntry(emp_id, entry))
    return store.save_entries(company_id, period, tuple(copied))


def year_data(store: DevStore, rules: RuleSet, company_id: str, year: int) -> YearData:
    """Every month of the tax year that has data, closed or still open."""
    months = []
    for month in sorted(store.months(company_id), key=lambda m: m.period):
        if month.period.year != year:
            continue
        try:
            result = run_month(store, rules, company_id, month.period)
        except ConflictError:
            continue
        hours = []
        for e in month.entries:
            total = e.entry.hours_total
            if total is None:
                total = sum((w.hours for w in e.entry.timesheet), Decimal(0))
            hours.append(EmployeeHours(e.employee_id, total))
        months.append(
            YearMonth(
                month.period,
                month.status,
                tuple(replace(p, trace=Trace()) for p in result.payslips),
                tuple(hours),
            )
        )
    return YearData(year, tuple(months))


def liabilities(
    store: DevStore, rules: RuleSet, company_id: str, period: Period
) -> tuple[Liability, ...]:
    """Accrued vacation and severance as of the month's end, using the termination rules."""
    slips = run_month(store, rules, company_id, period).payslips
    out = []
    for slip in slips:
        record = store.employee(company_id, slip.employee_id)
        funded = sum(
            (
                p.contributions.severance_employer
                for m in store.months(company_id)
                if m.period <= period
                for p in m.approved
                if p.employee_id == slip.employee_id
            ),
            Decimal(0),
        )
        days = max(slip.balances.vacation, Decimal(0))
        end = period.last_day
        if record.employee.end_date and record.employee.end_date < end:
            end = record.employee.end_date
        result = terminate(
            store,
            rules,
            company_id,
            slip.employee_id,
            TerminationRequest(
                termination_date=end,
                last_salary=slip.bases.severance,
                severance_fund_balance=funded,
                notice_required=False,
                vacation_balance=days,
            ),
        )
        out.append(
            Liability(
                slip.employee_id,
                days,
                result.vacation_payout,
                result.severance_entitlement,
                funded,
                result.employer_severance_payment,
            )
        )
    return tuple(out)


def _history(store: DevStore, company_id: str, period: Period) -> dict[str, list[Payslip]]:
    history: dict[str, list[Payslip]] = {}
    for month in _approved_before(store, company_id, period)[-HISTORY_MONTHS:]:
        for slip in month.approved:
            history.setdefault(slip.employee_id, []).append(slip)
    return history


def production(month: MonthRecord, slips: Sequence[Payslip]) -> Production:
    due = {p.employee_id for p in slips}
    made = tuple(e for e in month.produced if e in due)
    sent = tuple(e for e in month.sent if e in due)
    return Production(len(due), len(made), len(sent), made, sent)


def run_month(store: DevStore, rules: RuleSet, company_id: str, period: Period) -> RunResult:
    month = store.month(company_id, period)
    if month.status == MonthStatus.APPROVED:
        made = production(month, month.approved)
        return RunResult(
            period, month.status, False, False, made, month.approved, form102(month.approved)
        )
    inputs = build_inputs(store, rules, company_id, period)
    if not inputs:
        raise ConflictError("no employees are employed in this month")
    run = run_payroll(inputs, rules, _history(store, company_id, period))
    made = production(month, run.payslips)
    complete = made.sent == made.expected
    return RunResult(
        period,
        month.status,
        run.can_approve and complete,
        run.can_approve,
        made,
        run.payslips,
        run.form102,
    )


def produce_month(store: DevStore, rules: RuleSet, company_id: str, period: Period) -> RunResult:
    """Mark every payslip of the month as produced and sent.

    Placeholder: no documents are generated and nothing is delivered yet.
    """
    result = run_month(store, rules, company_id, period)
    if result.status == MonthStatus.APPROVED:
        raise ConflictError("this month is already approved")
    if not result.can_produce:
        raise ConflictError("errors must be fixed before payslips are produced")
    ids = tuple(p.employee_id for p in result.payslips)
    store.save_month(replace(store.month(company_id, period), produced=ids, sent=ids))
    return run_month(store, rules, company_id, period)


def approve_month(store: DevStore, rules: RuleSet, company_id: str, period: Period) -> RunResult:
    result = run_month(store, rules, company_id, period)
    if result.status == MonthStatus.APPROVED:
        raise ConflictError("this month is already approved")
    if not result.can_produce:
        raise ConflictError("errors must be fixed before approval")
    if not result.can_approve:
        raise ConflictError("every payslip must be produced and sent before the month is closed")
    month = store.month(company_id, period)
    store.save_month(
        replace(month, status=MonthStatus.APPROVED, approved=result.payslips, previous=())
    )
    return replace(result, status=MonthStatus.APPROVED, can_approve=False, can_produce=False)


def reopen_month(store: DevStore, company_id: str, period: Period) -> MonthRecord:
    month = store.month(company_id, period)
    if month.status != MonthStatus.APPROVED:
        raise ConflictError("only an approved month can be reopened")
    return store.save_month(
        replace(month, status=MonthStatus.DRAFT, previous=month.approved, approved=())
    )


def correction_diff(
    store: DevStore, rules: RuleSet, company_id: str, period: Period
) -> CorrectionDiff:
    month = store.month(company_id, period)
    if month.status == MonthStatus.APPROVED or not month.previous:
        return CorrectionDiff(period, ())
    current = {p.employee_id: p for p in run_month(store, rules, company_id, period).payslips}
    items = tuple(
        EmployeeDiff(old.employee_id, diff(old, current[old.employee_id]))
        for old in month.previous
        if old.employee_id in current
    )
    return CorrectionDiff(period, items)


def summarize(store: DevStore, rules: RuleSet, company_id: str, period: Period) -> CompanySummary:
    company = store.company(company_id)
    month = store.month(company_id, period)
    try:
        slips = run_month(store, rules, company_id, period).payslips
    except ConflictError:
        slips = ()
    flags = [f for p in slips for f in p.flags if f.code != TRUST_NOTE]

    def total(pick: Callable[[Payslip], Decimal]) -> Decimal:
        return sum((pick(p) for p in slips), Decimal(0))

    return CompanySummary(
        company=company,
        employees=len(slips),
        period=period,
        status=month.status,
        errors=sum(1 for f in flags if f.severity is Severity.ERROR),
        warnings=sum(1 for f in flags if f.severity is Severity.WARNING),
        infos=sum(1 for f in flags if f.severity is Severity.INFO),
        production=production(month, slips),
        net_total=total(lambda p: p.net_pay),
        employer_cost_total=total(lambda p: p.employer_cost),
        gross_total=total(lambda p: p.bases.gross_cash),
        tax_total=total(lambda p: p.income_tax.tax),
        insurance_total=total(
            lambda p: (
                p.national_insurance.bl_employee
                + p.national_insurance.health_employee
                + p.national_insurance.bl_employer
            )
        ),
        pension_total=total(
            lambda p: (
                p.contributions.pension_employee
                + p.contributions.pension_employer
                + p.contributions.severance_employer
            )
        ),
    )


def annual(store: DevStore, rules: RuleSet, company_id: str, year: int) -> AnnualResult:
    by_employee: dict[str, list[Payslip]] = {}
    covered = 0
    for month in store.months(company_id):
        if month.status == MonthStatus.APPROVED and month.period.year == year:
            covered = max(covered, month.period.month)
            for slip in month.approved:
                by_employee.setdefault(slip.employee_id, []).append(slip)
    if covered == 0:
        return AnnualResult(year, 0, ())
    # A year in progress is reconciled year to date, against brackets for the months covered.
    items = tuple(
        reconcile_year(sorted(slips, key=lambda p: p.period), rules, covered)
        for _, slips in sorted(by_employee.items())
    )
    return AnnualResult(year, covered, items)


def terminate(
    store: DevStore, rules: RuleSet, company_id: str, employee_id: str, req: TerminationRequest
) -> TerminationResult:
    record = store.employee(company_id, employee_id)
    last_salary = req.last_salary
    if last_salary is None:
        latest = [
            p
            for m in sorted(store.months(company_id), key=lambda m: m.period)
            for p in m.approved
            if p.employee_id == employee_id
        ]
        if latest:
            last_salary = latest[-1].bases.severance
        else:
            last_salary = record.employee.monthly_salary or Decimal(0)
    return calculate_termination(
        TerminationInput(
            employee=record.employee,
            termination_date=req.termination_date,
            last_salary=last_salary,
            service_periods=req.service_periods,
            severance_fund_balance=req.severance_fund_balance,
            entitled_to_severance=req.entitled_to_severance,
            notice_days_given=req.notice_days_given,
            notice_required=req.notice_required,
            vacation_balance=req.vacation_balance,
            unpaid_recuperation_days=req.unpaid_recuperation_days,
        ),
        rules,
    )


def open_months(store: DevStore, company_id: str, today: date | None = None) -> OpenMonths:
    """The month being worked on is the latest one, or the next if the latest is closed.
    Earlier months still in draft stay open too, and only open months can be worked on."""
    records = sorted(store.months(company_id), key=lambda m: m.period)
    if not records:
        day = today or date.today()
        current = Period(day.year, day.month)
        return OpenMonths(current, (current,))
    latest = records[-1]
    current = (
        latest.period if latest.status == MonthStatus.DRAFT else shift_period(latest.period, 1)
    )
    earlier = tuple(
        m.period for m in records if m.status == MonthStatus.DRAFT and m.period < current
    )
    return OpenMonths(current, (*earlier, current))


def portfolio(store: DevStore, rules: RuleSet, firm_id: str) -> tuple[PortfolioRow, ...]:
    rows = []
    for company in store.data.companies:
        if company.firm_id != firm_id:
            continue
        months = open_months(store, company.id)
        rows.append(
            PortfolioRow(
                summarize(store, rules, company.id, months.current),
                tuple(p for p in months.open if p < months.current),
            )
        )
    return tuple(rows)


def preview(
    store: DevStore,
    rules: RuleSet,
    company_id: str,
    period: Period,
    employee_id: str,
    request: PreviewRequest,
) -> MonthPreview:
    """One employee's payslip as it is, and as it would be with the unsaved changes."""
    month = store.month(company_id, period)
    if month.status == MonthStatus.APPROVED:
        raise ConflictError("this month is closed")
    history = _history(store, company_id, period).get(employee_id, [])
    current = build_inputs(store, rules, company_id, period, only=employee_id)
    before = calculate(current[0], rules, history) if current else None
    changed = build_inputs(store, rules, company_id, period, request, only=employee_id)
    if not changed:
        raise ConflictError("the employee is not employed in this month")
    return MonthPreview(before, calculate(changed[0], rules, history))
