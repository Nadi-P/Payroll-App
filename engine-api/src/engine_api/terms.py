"""Employment-term history: what changed between two versions of an employee record."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from uuid import uuid4

from engine_api.models import EmployeeRecord, FundEnrollment, StandingLine, TermChange, User


def _text(value: object) -> str:
    return "" if value is None else str(value)


# Terms tracked one by one: (field name, how to read it from a record).
SCALARS: tuple[tuple[str, Callable[[EmployeeRecord], object]], ...] = (
    ("kind", lambda r: r.employee.kind),
    ("monthly_salary", lambda r: r.employee.monthly_salary),
    ("hourly_rate", lambda r: r.employee.hourly_rate),
    ("job_fraction", lambda r: r.employee.job_fraction),
    ("work_week", lambda r: r.employee.work_week),
    ("start_date", lambda r: r.employee.start_date),
    ("end_date", lambda r: r.employee.end_date),
    ("department", lambda r: r.profile.department),
    ("sub_department", lambda r: r.profile.sub_department),
    ("position", lambda r: r.profile.position),
    ("insurance_category", lambda r: r.employee.insurance_category),
)


def _standing(line: StandingLine) -> str:
    period = ""
    if line.valid_from or line.valid_to:
        period = f" ({_text(line.valid_from)}–{_text(line.valid_to)})"
    return f"{line.amount}{period}"


def _fund(f: FundEnrollment) -> str:
    rates = [
        ("employee", f.employee_rate),
        ("employer", f.employer_rate),
        ("severance", f.severance_rate),
        ("disability_employee", f.disability_employee_rate or None),
        ("disability_employer", f.disability_employer_rate or None),
        ("other_employee", f.other_employee_rate or None),
        ("other_employer", f.other_employer_rate or None),
    ]
    parts = [f"{name} {rate}%" for name, rate in rates if rate is not None]
    share = f" · {f.salary_share}%" if f.salary_share != 100 else ""
    return f"{f.name}{share}: " + (", ".join(parts) or "statutory")


def changes(old: EmployeeRecord | None, new: EmployeeRecord, user: User | None) -> list[TermChange]:
    at = datetime.now(UTC).isoformat(timespec="seconds")
    out: list[TermChange] = []

    def add(field: str, change: str, before: str = "", after: str = "") -> None:
        out.append(
            TermChange(
                id=uuid4().hex[:12],
                company_id=new.company_id,
                employee_id=new.employee.employee_id,
                at=at,
                field=field,
                change=change,
                old=before,
                new=after,
                user_id=user.id if user else "",
                user_name=user.name if user else "",
            )
        )

    if old is None:
        add("employment", "added", after=_text(new.employee.start_date))
        return out

    for name, read in SCALARS:
        a, b = _text(read(old)), _text(read(new))
        if a != b:
            add(name, "added" if not a else "removed" if not b else "changed", a, b)

    def keyed(
        prefix: str,
        before: dict[str, str],
        after: dict[str, str],
    ) -> None:
        for key in sorted(before.keys() | after.keys()):
            a, b = before.get(key), after.get(key)
            if a == b:
                continue
            change = "added" if a is None else "removed" if b is None else "changed"
            add(f"{prefix}:{key}", change, a or "", b or "")

    keyed(
        "standing",
        {s.code: _standing(s) for s in old.standing},
        {s.code: _standing(s) for s in new.standing},
    )
    keyed("fund", {f.code: _fund(f) for f in old.funds}, {f.code: _fund(f) for f in new.funds})
    return out
