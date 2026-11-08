"""Temporary development store: the whole dataset in one JSON file, rewritten on every change.

Not for real data and not secure. The database API of the next phase replaces it.
"""

from __future__ import annotations

import threading
from collections.abc import Callable
from dataclasses import replace
from pathlib import Path

from engine_api.models import (
    Company,
    EmployeeEntry,
    EmployeeRecord,
    MonthEntry,
    MonthRecord,
    StoreData,
    TermChange,
    User,
)
from payroll_engine.dates import Period
from payroll_engine.serialization import dumps, from_dict, loads


class NotFoundError(KeyError):
    pass


class ConflictError(ValueError):
    pass


class DevStore:
    def __init__(self, path: Path, seed: Callable[[], StoreData]) -> None:
        self._path = path
        self._lock = threading.Lock()
        if path.exists():
            self._data = from_dict(StoreData, loads(path.read_text("utf-8")))
        else:
            self._data = seed()
            self._save()

    @property
    def data(self) -> StoreData:
        return self._data

    def update(self, change: Callable[[StoreData], StoreData]) -> StoreData:
        with self._lock:
            self._data = change(self._data)
            self._save()
            return self._data

    def _save(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._path.with_suffix(".tmp")
        tmp.write_text(dumps(self._data), "utf-8")
        tmp.replace(self._path)

    # ---- queries ---------------------------------------------------------------------------

    def company(self, company_id: str) -> Company:
        for company in self._data.companies:
            if company.id == company_id:
                return company
        raise NotFoundError(f"company {company_id}")

    def employees(self, company_id: str) -> tuple[EmployeeRecord, ...]:
        self.company(company_id)
        return tuple(e for e in self._data.employees if e.company_id == company_id)

    def employee(self, company_id: str, employee_id: str) -> EmployeeRecord:
        for record in self.employees(company_id):
            if record.employee.employee_id == employee_id:
                return record
        raise NotFoundError(f"employee {employee_id}")

    def month(self, company_id: str, period: Period) -> MonthRecord:
        self.company(company_id)
        for month in self._data.months:
            if month.company_id == company_id and month.period == period:
                return month
        return MonthRecord(company_id, period)

    def months(self, company_id: str) -> tuple[MonthRecord, ...]:
        return tuple(m for m in self._data.months if m.company_id == company_id)

    def user(self, user_id: str) -> User | None:
        return next((u for u in self._data.users if u.id == user_id), None)

    def term_changes(self, company_id: str, employee_id: str) -> tuple[TermChange, ...]:
        return tuple(
            c
            for c in self._data.term_changes
            if c.company_id == company_id and c.employee_id == employee_id
        )

    def add_term_changes(self, changes: tuple[TermChange, ...]) -> None:
        if changes:
            self.update(lambda data: replace(data, term_changes=data.term_changes + changes))

    # ---- changes ---------------------------------------------------------------------------

    def add_company(self, company: Company) -> Company:
        self.update(lambda data: replace(data, companies=data.companies + (company,)))
        return company

    def save_company(self, company: Company) -> Company:
        self.company(company.id)
        self.update(
            lambda data: replace(
                data,
                companies=tuple(c if c.id != company.id else company for c in data.companies),
            )
        )
        return company

    def add_employee(self, record: EmployeeRecord) -> EmployeeRecord:
        """Add a new employee. The id "new" means: give them the company's next number."""
        existing = self.employees(record.company_id)
        ids = {e.employee.employee_id for e in existing}
        emp_id = record.employee.employee_id
        if emp_id == "new":
            n = len(existing) + 1
            while f"{record.company_id}-{n:03d}" in ids:
                n += 1
            emp_id = f"{record.company_id}-{n:03d}"
        if emp_id in ids:
            raise ConflictError(f"employee {emp_id} already exists")
        if record.profile.national_id in {e.profile.national_id for e in existing}:
            raise ConflictError(f"ID number {record.profile.national_id} already exists")
        return self.save_employee(
            replace(record, employee=replace(record.employee, employee_id=emp_id))
        )

    def save_employee(self, record: EmployeeRecord) -> EmployeeRecord:
        self.company(record.company_id)

        def change(data: StoreData) -> StoreData:
            others = tuple(
                e
                for e in data.employees
                if (e.company_id, e.employee.employee_id)
                != (record.company_id, record.employee.employee_id)
            )
            return replace(data, employees=others + (record,))

        self.update(change)
        return record

    def save_month(self, month: MonthRecord) -> MonthRecord:
        def change(data: StoreData) -> StoreData:
            others = tuple(
                m
                for m in data.months
                if (m.company_id, m.period) != (month.company_id, month.period)
            )
            return replace(data, months=others + (month,))

        self.update(change)
        return month

    def save_entries(
        self, company_id: str, period: Period, entries: tuple[EmployeeEntry, ...]
    ) -> MonthRecord:
        """Save several entries at once: all of them apply, or none (one write)."""
        for e in entries:
            self.employee(company_id, e.employee_id)
        month = self.month(company_id, period)
        if month.status != "draft":
            raise ConflictError("this month is approved; reopen it to make corrections")
        changed = {e.employee_id for e in entries}
        kept = tuple(e for e in month.entries if e.employee_id not in changed)
        # A changed entry changes the payslip, so it has to be produced and sent again.
        return self.save_month(
            replace(
                month,
                entries=kept + entries,
                produced=tuple(e for e in month.produced if e not in changed),
                sent=tuple(e for e in month.sent if e not in changed),
            )
        )

    def save_entry(
        self, company_id: str, period: Period, employee_id: str, entry: MonthEntry
    ) -> MonthRecord:
        return self.save_entries(company_id, period, (EmployeeEntry(employee_id, entry),))
