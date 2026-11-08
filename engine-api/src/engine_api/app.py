"""FastAPI application. Bodies are parsed with the engine's strict decoder and responses are
encoded with its JSON encoder, so the API speaks exactly the engine's data shapes."""

from __future__ import annotations

import os
import re
from dataclasses import replace
from datetime import date
from pathlib import Path
from typing import Any, TypeVar
from uuid import uuid4

from fastapi import Body, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from engine_api import payroll_service as svc
from engine_api import reports as base_reports
from engine_api import terms
from engine_api.funds import sync_funds
from engine_api.models import (
    Assignees,
    Company,
    CoverageGap,
    EmployeeRecord,
    EntryBatch,
    Holiday,
    MonthEntry,
    MonthInfo,
    MonthView,
    NewCompany,
    PreviewRequest,
    Role,
    RulesMeta,
    TerminationRequest,
    User,
)
from engine_api.seed import seed_store
from engine_api.store import ConflictError, DevStore, NotFoundError
from payroll_engine import calculate, default_rules
from payroll_engine.components import Catalog, CustomComponent, UnknownComponentError
from payroll_engine.dates import Period
from payroll_engine.models import InputError, PayslipInput
from payroll_engine.rules import RuleError, RuleSet, coverage_gaps
from payroll_engine.serialization import SerializationError, from_dict, to_jsonable

T = TypeVar("T")
COMPONENT_CODE = re.compile(r"[A-Z][A-Z0-9_]*")
DEFAULT_STORE = Path(__file__).resolve().parents[2] / "dev-data" / "store.json"
ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]


def _json(obj: object, status: int = 200) -> JSONResponse:
    return JSONResponse(to_jsonable(obj), status_code=status)


def _parse(cls: type[T], body: Any) -> T:
    return from_dict(cls, body)


def _period(raw: str) -> Period:
    try:
        year, month = raw.split("-")
        return Period(int(year), int(month))
    except ValueError:
        raise InputError(f"period must look like 2026-10, got {raw!r}") from None


class ForbiddenError(PermissionError):
    pass


def create_app(store: DevStore, rules: RuleSet) -> FastAPI:
    app = FastAPI(title="Payroll engine API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["Content-Type", "X-User"],
    )

    # ---- who is asking ---------------------------------------------------------------------
    # Until sign-in exists the web app names its user in the X-User header. Without one (tests,
    # scripts) the caller acts as a firm admin.

    def current_user(request: Request) -> User | None:
        user_id = request.headers.get("x-user")
        if not user_id:
            return None
        user = store.user(user_id)
        if user is None:
            raise ForbiddenError(f"unknown user {user_id}")
        return user

    def require_edit(request: Request, company_id: str) -> User | None:
        """Viewers read only; accountants edit clients assigned to them or to nobody."""
        user = current_user(request)
        company = store.company(company_id)
        if user is None or user.role in (Role.ADMIN, Role.LEAD):
            return user
        if user.role is Role.VIEWER:
            raise ForbiddenError("read-only users cannot make changes")
        if company.assignees and user.id not in company.assignees:
            raise ForbiddenError("this client is assigned to someone else")
        return user

    def require_manager(request: Request) -> User | None:
        user = current_user(request)
        if user is not None and user.role not in (Role.ADMIN, Role.LEAD):
            raise ForbiddenError("only admins and team leads can do this")
        return user

    def require_open(company_id: str, period: Period) -> None:
        if period not in svc.open_months(store, company_id).open:
            raise ConflictError("only open payroll months can be changed")

    @app.exception_handler(InputError)
    @app.exception_handler(SerializationError)
    @app.exception_handler(RuleError)
    @app.exception_handler(UnknownComponentError)
    async def invalid(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse({"error": "invalid_input", "detail": str(exc).strip("'\"")}, 422)

    @app.exception_handler(NotFoundError)
    async def not_found(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse({"error": "not_found", "detail": str(exc).strip("'\"")}, 404)

    @app.exception_handler(ForbiddenError)
    async def forbidden(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse({"error": "forbidden", "detail": str(exc)}, 403)

    @app.exception_handler(ConflictError)
    async def conflict(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse({"error": "conflict", "detail": str(exc)}, 409)

    # ---- reference data ------------------------------------------------------------------

    @app.get("/health")
    def health() -> JSONResponse:
        return _json({"ok": True})

    @app.get("/meta")
    def meta(on: date | None = None) -> JSONResponse:
        resolved = rules.at(on or date.today())
        return _json(RulesMeta(resolved.version, resolved.unverified()))

    @app.get("/rules")
    def rule_versions() -> JSONResponse:
        return _json(rules.entries())

    @app.get("/rules/coverage")
    def coverage(first: str, last: str) -> JSONResponse:
        gaps = coverage_gaps(rules, _period(first), _period(last))
        return _json(tuple(CoverageGap(p, r) for p, r in gaps))

    @app.get("/catalog")
    def catalog(on: date | None = None) -> JSONResponse:
        return _json(Catalog.from_rules(rules.at(on or date.today())).components())

    @app.get("/holidays")
    def holidays(year: int) -> JSONResponse:
        calendars = rules.at(date(year, 12, 31)).value("calendar.holidays")
        items = sorted(
            (
                Holiday(date.fromisoformat(h["date"]), name, h["he"], h["en"])
                for name, days in calendars.items()
                for h in days
            ),
            key=lambda h: h.date,
        )
        return _json(tuple(items))

    @app.post("/calculate")
    def simulate(body: Any = Body(...)) -> JSONResponse:
        return _json(calculate(_parse(PayslipInput, body), rules))

    # ---- firms and companies -------------------------------------------------------------

    @app.get("/firms")
    def firms() -> JSONResponse:
        return _json(store.data.firms)

    @app.get("/firms/{firm_id}/users")
    def firm_users(firm_id: str) -> JSONResponse:
        return _json(tuple(u for u in store.data.users if u.firm_id == firm_id))

    @app.get("/firms/{firm_id}/portfolio")
    def firm_portfolio(firm_id: str) -> JSONResponse:
        return _json(svc.portfolio(store, rules, firm_id))

    @app.put("/companies/{company_id}/assignees")
    def save_assignees(company_id: str, request: Request, body: Any = Body(...)) -> JSONResponse:
        require_manager(request)
        wanted = _parse(Assignees, body).assignees
        company = store.company(company_id)
        known = {u.id for u in store.data.users if u.firm_id == company.firm_id}
        unknown = [u for u in wanted if u not in known]
        if unknown:
            raise InputError(f"unknown users: {', '.join(unknown)}")
        return _json(store.save_company(replace(company, assignees=tuple(dict.fromkeys(wanted)))))

    @app.get("/companies/{company_id}/open-months")
    def company_open_months(company_id: str) -> JSONResponse:
        store.company(company_id)
        return _json(svc.open_months(store, company_id))

    @app.get("/companies/{company_id}/reports/{report}")
    def company_report(company_id: str, report: str) -> JSONResponse:
        return _json({"rows": base_reports.build(store, rules, company_id, report)})

    @app.get("/firms/{firm_id}/companies")
    def firm_companies(firm_id: str, period: str) -> JSONResponse:
        p = _period(period)
        companies = [c for c in store.data.companies if c.firm_id == firm_id]
        return _json(tuple(svc.summarize(store, rules, c.id, p) for c in companies))

    @app.post("/firms/{firm_id}/companies")
    def add_company(firm_id: str, request: Request, body: Any = Body(...)) -> JSONResponse:
        require_manager(request)
        new = _parse(NewCompany, body)
        if not new.name.strip():
            raise InputError("a company needs a name")
        if firm_id not in {f.id for f in store.data.firms}:
            raise NotFoundError(f"firm {firm_id}")
        company_id = f"co-{uuid4().hex[:8]}"
        company = Company(company_id, firm_id, new.name.strip(), new.deductions_file, new.settings)
        return _json(store.add_company(company), 201)

    @app.put("/companies/{company_id}")
    def save_company(company_id: str, request: Request, body: Any = Body(...)) -> JSONResponse:
        require_edit(request, company_id)
        company = _parse(Company, body)
        if company.id != company_id:
            raise InputError("the company id must match the address")
        # Assignments change only through their own endpoint.
        company = replace(company, assignees=store.company(company_id).assignees)
        return _json(store.save_company(company))

    @app.get("/companies/{company_id}/catalog")
    def company_catalog(company_id: str, on: date | None = None) -> JSONResponse:
        day = on or date.today()
        return _json(svc.company_catalog(store, rules, company_id, day).components())

    @app.put("/companies/{company_id}/components/{code}")
    def save_component(
        company_id: str, code: str, request: Request, body: Any = Body(...)
    ) -> JSONResponse:
        require_edit(request, company_id)
        component = _parse(CustomComponent, body)
        if component.code != code or not COMPONENT_CODE.fullmatch(code):
            raise InputError("a component code uses capital letters, digits and underscores")
        company = store.company(company_id)
        others = tuple(c for c in company.components if c.code != code)
        store.save_company(replace(company, components=others + (component,)))
        return _json(component)

    @app.get("/companies/{company_id}")
    def company(company_id: str) -> JSONResponse:
        return _json(store.company(company_id))

    # ---- employees -----------------------------------------------------------------------

    @app.get("/companies/{company_id}/employees")
    def employees(company_id: str) -> JSONResponse:
        return _json(store.employees(company_id))

    @app.post("/companies/{company_id}/employees")
    def add_employee(company_id: str, request: Request, body: Any = Body(...)) -> JSONResponse:
        user = require_edit(request, company_id)
        record = sync_funds(_parse(EmployeeRecord, body), rules)
        if record.company_id != company_id:
            raise InputError("company_id must match the address")
        saved = store.add_employee(record)
        store.add_term_changes(tuple(terms.changes(None, saved, user)))
        return _json(saved, 201)

    @app.get("/companies/{company_id}/employees/{employee_id}")
    def employee(company_id: str, employee_id: str) -> JSONResponse:
        return _json(store.employee(company_id, employee_id))

    @app.put("/companies/{company_id}/employees/{employee_id}")
    def save_employee(
        company_id: str, employee_id: str, request: Request, body: Any = Body(...)
    ) -> JSONResponse:
        user = require_edit(request, company_id)
        record = sync_funds(_parse(EmployeeRecord, body), rules)
        if (record.company_id, record.employee.employee_id) != (company_id, employee_id):
            raise InputError("company_id and employee_id must match the address")
        old = store.employee(company_id, employee_id)
        saved = store.save_employee(record)
        store.add_term_changes(tuple(terms.changes(old, saved, user)))
        return _json(saved)

    @app.get("/companies/{company_id}/employees/{employee_id}/changes")
    def employee_changes(company_id: str, employee_id: str) -> JSONResponse:
        store.employee(company_id, employee_id)
        return _json(store.term_changes(company_id, employee_id))

    @app.get("/companies/{company_id}/employees/{employee_id}/payslips")
    def employee_payslips(company_id: str, employee_id: str) -> JSONResponse:
        store.employee(company_id, employee_id)
        slips = [
            p
            for m in sorted(store.months(company_id), key=lambda m: m.period)
            for p in m.approved
            if p.employee_id == employee_id
        ]
        return _json(tuple(slips))

    @app.post("/companies/{company_id}/employees/{employee_id}/termination")
    def termination(company_id: str, employee_id: str, body: Any = Body(...)) -> JSONResponse:
        req = _parse(TerminationRequest, body)
        return _json(svc.terminate(store, rules, company_id, employee_id, req))

    # ---- payroll months ------------------------------------------------------------------

    @app.get("/companies/{company_id}/months")
    def months(company_id: str) -> JSONResponse:
        records = sorted(store.months(company_id), key=lambda m: m.period)
        return _json(tuple(MonthInfo(m.period, m.status) for m in records))

    @app.get("/companies/{company_id}/months/{period}")
    def month(company_id: str, period: str) -> JSONResponse:
        p = _period(period)
        record = store.month(company_id, p)
        employed = tuple(e for e in store.employees(company_id) if svc.employed_in(e, p))
        return _json(MonthView(company_id, p, record.status, employed, record.entries))

    @app.put("/companies/{company_id}/months/{period}/entries/{employee_id}")
    def save_entry(
        company_id: str, period: str, employee_id: str, request: Request, body: Any = Body(...)
    ) -> JSONResponse:
        require_edit(request, company_id)
        entry = _parse(MonthEntry, body)
        p = _period(period)
        require_open(company_id, p)
        record = store.save_entry(company_id, p, employee_id, entry)
        return _json(MonthInfo(record.period, record.status))

    @app.put("/companies/{company_id}/months/{period}/entries")
    def save_entries(
        company_id: str, period: str, request: Request, body: Any = Body(...)
    ) -> JSONResponse:
        require_edit(request, company_id)
        batch = _parse(EntryBatch, body)
        require_open(company_id, _period(period))
        record = store.save_entries(company_id, _period(period), batch.entries)
        return _json(MonthInfo(record.period, record.status))

    @app.post("/companies/{company_id}/months/{period}/copy-previous")
    def copy_previous(company_id: str, period: str, request: Request) -> JSONResponse:
        require_edit(request, company_id)
        require_open(company_id, _period(period))
        record = svc.copy_previous_month(store, rules, company_id, _period(period))
        return _json(MonthInfo(record.period, record.status))

    @app.get("/companies/{company_id}/months/{period}/liabilities")
    def liabilities(company_id: str, period: str) -> JSONResponse:
        return _json(svc.liabilities(store, rules, company_id, _period(period)))

    @app.get("/companies/{company_id}/years/{year}/data")
    def year_data(company_id: str, year: int) -> JSONResponse:
        return _json(svc.year_data(store, rules, company_id, year))

    @app.post("/companies/{company_id}/months/{period}/run")
    def run(company_id: str, period: str) -> JSONResponse:
        return _json(svc.run_month(store, rules, company_id, _period(period)))

    @app.post("/companies/{company_id}/months/{period}/produce")
    def produce(company_id: str, period: str, request: Request) -> JSONResponse:
        require_edit(request, company_id)
        require_open(company_id, _period(period))
        return _json(svc.produce_month(store, rules, company_id, _period(period)))

    @app.post("/companies/{company_id}/months/{period}/approve")
    def approve(company_id: str, period: str, request: Request) -> JSONResponse:
        require_edit(request, company_id)
        require_open(company_id, _period(period))
        return _json(svc.approve_month(store, rules, company_id, _period(period)))

    @app.post("/companies/{company_id}/months/{period}/reopen")
    def reopen(company_id: str, period: str, request: Request) -> JSONResponse:
        require_manager(request)
        require_edit(request, company_id)
        record = svc.reopen_month(store, company_id, _period(period))
        return _json(MonthInfo(record.period, record.status))

    @app.post("/companies/{company_id}/months/{period}/preview/{employee_id}")
    def preview(
        company_id: str, period: str, employee_id: str, body: Any = Body(...)
    ) -> JSONResponse:
        request = _parse(PreviewRequest, body)
        return _json(svc.preview(store, rules, company_id, _period(period), employee_id, request))

    @app.get("/companies/{company_id}/months/{period}/corrections")
    def corrections(company_id: str, period: str) -> JSONResponse:
        return _json(svc.correction_diff(store, rules, company_id, _period(period)))

    @app.get("/companies/{company_id}/years/{year}/annual")
    def annual(company_id: str, year: int) -> JSONResponse:
        return _json(svc.annual(store, rules, company_id, year))

    return app


def build() -> FastAPI:
    """App factory: `uvicorn engine_api.app:build --factory` (shipped rules, demo store)."""
    rules = default_rules()
    path = Path(os.environ.get("PAYROLL_DEV_STORE", DEFAULT_STORE))
    return create_app(seed_store(path, rules), rules)
