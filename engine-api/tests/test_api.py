from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from engine_api.app import create_app
from engine_api.seed import seed_store
from payroll_engine import default_rules

RULES = default_rules()


@pytest.fixture(scope="module")
def seeded(tmp_path_factory: pytest.TempPathFactory) -> Path:
    path = tmp_path_factory.mktemp("store") / "store.json"
    seed_store(path, RULES)
    return path


@pytest.fixture
def client(seeded: Path, tmp_path: Path) -> Iterator[TestClient]:
    # Each test gets its own copy of the seeded store, so changes never leak between tests.
    path = tmp_path / "store.json"
    path.write_bytes(seeded.read_bytes())
    with TestClient(create_app(seed_store(path, RULES), RULES)) as c:
        yield c


SIMPLE_INPUT: dict[str, Any] = {
    "employee": {
        "employee_id": "X",
        "birth_date": "1990-05-01",
        "gender": "male",
        "start_date": "2020-01-01",
        "kind": "monthly",
        "monthly_salary": "10000",
    },
    "period": {"year": 2026, "month": 1},
    "settings": {"recuperation_month": 7},
}


def test_calculate_matches_engine(client: TestClient) -> None:
    res = client.post("/calculate", json=SIMPLE_INPUT)
    assert res.status_code == 200
    assert res.json()["net_pay"] == "8816.44"


def test_invalid_input_reports_field_path(client: TestClient) -> None:
    bad = {**SIMPLE_INPUT, "employee": {**SIMPLE_INPUT["employee"], "birth_date": "nope"}}
    res = client.post("/calculate", json=bad)
    assert res.status_code == 422
    assert "PayslipInput.employee.birth_date" in res.json()["detail"]
    res = client.post(
        "/calculate",
        json={**SIMPLE_INPUT, "employee": {**SIMPLE_INPUT["employee"], "work_week": 4}},
    )
    assert res.status_code == 422


def test_portfolio_and_month(client: TestClient) -> None:
    firms = client.get("/firms").json()
    summaries = client.get(
        f"/firms/{firms[0]['id']}/companies", params={"period": "2026-10"}
    ).json()
    assert {s["company"]["id"] for s in summaries} == {"cafe", "northwind", "galil"}
    galil = next(s for s in summaries if s["company"]["id"] == "galil")
    assert galil["errors"] == 1 and galil["status"] == "draft"
    assert all(s["infos"] == 0 for s in summaries)  # the unverified-rules note is not a flag
    production = {s["company"]["id"]: s["production"] for s in summaries}
    assert production["northwind"]["sent"] == production["northwind"]["expected"] == 6
    assert production["cafe"]["produced"] == 0
    assert 0 < production["galil"]["produced"] < production["galil"]["expected"]
    view = client.get("/companies/galil/months/2026-10").json()
    assert len(view["employees"]) == 5
    assert client.get("/companies/galil/months").json()[-1]["period"] == {"year": 2026, "month": 10}


def test_approval_blocked_until_error_fixed(client: TestClient) -> None:
    assert client.post("/companies/galil/months/2026-10/approve").status_code == 409
    record = client.get("/companies/galil/employees/galil-004").json()
    record["employee"]["pension"] = {}
    assert client.put("/companies/galil/employees/galil-004", json=record).status_code == 200
    run = client.post("/companies/galil/months/2026-10/run").json()
    assert run["can_produce"] is True and run["can_approve"] is False  # not all produced yet
    assert client.post("/companies/galil/months/2026-10/approve").status_code == 409
    produced = client.post("/companies/galil/months/2026-10/produce").json()
    assert produced["can_approve"] is True
    assert produced["production"]["sent"] == produced["production"]["expected"]
    approved = client.post("/companies/galil/months/2026-10/approve").json()
    assert approved["status"] == "approved"
    entry = client.get("/companies/galil/months/2026-10").json()["entries"][0]
    put = client.put(
        f"/companies/galil/months/2026-10/entries/{entry['employee_id']}", json=entry["entry"]
    )
    assert put.status_code == 409  # approved months are locked


def test_editing_an_entry_unproduces_its_payslip(client: TestClient) -> None:
    view = client.get("/companies/northwind/months/2026-10").json()
    entry = view["entries"][0]
    client.put(
        f"/companies/northwind/months/2026-10/entries/{entry['employee_id']}", json=entry["entry"]
    )
    run = client.post("/companies/northwind/months/2026-10/run").json()
    assert run["production"]["sent"] == 5 and run["can_approve"] is False


def test_reopen_and_correction_diff(client: TestClient) -> None:
    assert client.post("/companies/cafe/months/2026-09/reopen").json()["status"] == "draft"
    view = client.get("/companies/cafe/months/2026-09").json()
    target = next(e for e in view["entries"] if e["employee_id"] == "cafe-003")
    target["entry"]["lines"].append({"code": "COMMISSION", "amount": "4321"})
    client.put("/companies/cafe/months/2026-09/entries/cafe-003", json=target["entry"])
    items = client.get("/companies/cafe/months/2026-09/corrections").json()["items"]
    changed = next(i for i in items if i["employee_id"] == "cafe-003")["diff"]
    assert ["COMMISSION", "4321.00"] in changed["lines"]
    assert changed["gross_cash"] == "4321.00"


def test_history_annual_and_termination(client: TestClient) -> None:
    slips = client.get("/companies/northwind/employees/northwind-001/payslips").json()
    assert len(slips) == 9
    annual = client.get("/companies/northwind/years/2026/annual").json()
    assert len(annual["items"]) == 7  # includes northwind-007, who left in August
    result = client.post(
        "/companies/northwind/employees/northwind-005/termination",
        json={"termination_date": "2026-10-31", "vacation_balance": "5"},
    ).json()
    assert float(result["severance_entitlement"]) > 0 and float(result["vacation_payout"]) > 0


def test_reference_endpoints(client: TestClient) -> None:
    assert (
        client.get("/rules/coverage", params={"first": "2025-01", "last": "2026-12"}).json() == []
    )
    assert any(r["rule_id"] == "income_tax.brackets" for r in client.get("/rules").json())
    catalog = client.get("/catalog", params={"on": "2026-10-01"}).json()
    assert next(c for c in catalog if c["code"] == "BONUS")["name_ru"] == "Премия"
    holidays = client.get("/holidays", params={"year": 2026}).json()
    assert {"date": "2026-10-27", "calendar": "general"}.items() <= holidays[-1].items()
    assert client.get("/meta").json()["version"]


def test_not_found(client: TestClient) -> None:
    assert client.get("/companies/nope").status_code == 404
    assert client.get("/companies/cafe/employees/nope").status_code == 404


def _new_employee(company: str, national_id: str = "000000018") -> dict[str, Any]:
    return {
        "company_id": company,
        "profile": {"first_name": "A", "last_name": "B", "national_id": national_id},
        "employee": {
            "employee_id": "new",
            "birth_date": "1990-01-01",
            "gender": "female",
            "start_date": "2026-10-01",
            "kind": "monthly",
            "monthly_salary": "10000",
            "pension": {},
        },
    }


def test_add_employee_and_company(client: TestClient) -> None:
    res = client.post("/companies/cafe/employees", json=_new_employee("cafe"))
    assert res.status_code == 201
    assert res.json()["employee"]["employee_id"] == "cafe-008"
    assert client.post("/companies/cafe/employees", json=_new_employee("cafe")).status_code == 409
    run = client.post("/companies/cafe/months/2026-10/run").json()
    assert "cafe-008" in {p["employee_id"] for p in run["payslips"]}

    made = client.post(
        "/firms/firm-1/companies", json={"name": "New Co", "deductions_file": "937000111"}
    )
    assert made.status_code == 201
    summaries = client.get("/firms/firm-1/companies", params={"period": "2026-10"}).json()
    assert "New Co" in {s["company"]["name"] for s in summaries}


def test_custom_component_counts_in_pay(client: TestClient) -> None:
    component = {
        "code": "SHIFT_BONUS",
        "name_he": "x",
        "name_en": "Shift bonus",
        "name_ar": "x",
        "name_ru": "x",
        "kind": "earning",
        "taxable": True,
        "insurable": True,
    }
    assert client.put("/companies/cafe/components/SHIFT_BONUS", json=component).status_code == 200
    catalog = client.get("/companies/cafe/catalog", params={"on": "2026-10-31"}).json()
    assert "SHIFT_BONUS" in {c["code"] for c in catalog}
    assert client.put("/companies/cafe/components/bad", json=component).status_code == 422

    def gross() -> float:
        run = client.post("/companies/cafe/months/2026-10/run").json()
        slip = next(p for p in run["payslips"] if p["employee_id"] == "cafe-003")
        return float(slip["bases"]["gross_cash"])

    before = gross()
    view = client.get("/companies/cafe/months/2026-10").json()
    entry = next(e for e in view["entries"] if e["employee_id"] == "cafe-003")["entry"]
    entry["lines"].append({"code": "SHIFT_BONUS", "amount": "700"})
    client.put("/companies/cafe/months/2026-10/entries/cafe-003", json=entry)
    assert gross() == pytest.approx(before + 700)


def test_standing_line_applies_until_overridden(client: TestClient) -> None:
    def deductions() -> dict[str, str]:
        run = client.post("/companies/cafe/months/2026-10/run").json()
        slip = next(p for p in run["payslips"] if p["employee_id"] == "cafe-003")
        return {d["code"]: d["applied"] for d in slip["deductions"]}

    record = client.get("/companies/cafe/employees/cafe-003").json()
    record["standing"] = [{"code": "LOAN_REPAYMENT", "amount": "300"}]
    client.put("/companies/cafe/employees/cafe-003", json=record)
    assert deductions()["LOAN_REPAYMENT"] == "300.00"

    view = client.get("/companies/cafe/months/2026-10").json()
    entry = next(e for e in view["entries"] if e["employee_id"] == "cafe-003")["entry"]
    entry["deductions"].append({"code": "LOAN_REPAYMENT", "amount": "0"})
    client.put("/companies/cafe/months/2026-10/entries/cafe-003", json=entry)
    assert "LOAN_REPAYMENT" not in deductions()  # typing 0 skips it this month


def test_batch_entries_and_hour_totals(client: TestClient) -> None:
    view = client.get("/companies/cafe/months/2026-10").json()
    entry = next(e for e in view["entries"] if e["employee_id"] == "cafe-001")["entry"]
    entry["timesheet"] = []
    entry["hours_total"] = "100"
    batch = {"entries": [{"employee_id": "cafe-001", "entry": entry}]}
    assert client.put("/companies/cafe/months/2026-10/entries", json=batch).status_code == 200
    run = client.post("/companies/cafe/months/2026-10/run").json()
    slip = next(p for p in run["payslips"] if p["employee_id"] == "cafe-001")
    hourly = next(line for line in slip["lines"] if line["code"] == "HOURLY_PAY")
    assert float(hourly["amount"]) == pytest.approx(100 * 42)


def test_copy_previous_month(client: TestClient) -> None:
    # November is not open while October is: months open one after another.
    assert client.post("/companies/cafe/months/2026-11/copy-previous").status_code == 409
    # galil left September open, so October can start from it.
    assert client.post("/companies/galil/months/2026-10/copy-previous").status_code == 200
    run = client.post("/companies/galil/months/2026-10/run").json()
    assert run["payslips"] and float(run["payslips"][0]["net_pay"]) > 0
    assert client.post("/companies/cafe/months/2026-09/copy-previous").status_code == 409  # closed


def test_open_months_and_portfolio(client: TestClient) -> None:
    galil = client.get("/companies/galil/open-months").json()
    assert galil["current"] == {"year": 2026, "month": 10}
    assert galil["open"] == [{"year": 2026, "month": 9}, {"year": 2026, "month": 10}]
    rows = {r["summary"]["company"]["id"]: r for r in client.get("/firms/firm-1/portfolio").json()}
    assert rows["galil"]["open_earlier"] == [{"year": 2026, "month": 9}]
    assert rows["cafe"]["open_earlier"] == []
    assert rows["cafe"]["summary"]["company"]["assignees"] == ["u-maya"]


def test_permissions(client: TestClient) -> None:
    entry = client.get("/companies/cafe/months/2026-10").json()["entries"][0]
    url = f"/companies/cafe/months/2026-10/entries/{entry['employee_id']}"
    as_user = lambda user: {"X-User": user}  # noqa: E731
    assert (
        client.put(url, json=entry["entry"], headers=as_user("u-shira")).status_code == 403
    )  # viewer
    assert (
        client.put(url, json=entry["entry"], headers=as_user("u-yossi")).status_code == 403
    )  # not his
    assert client.put(url, json=entry["entry"], headers=as_user("u-maya")).status_code == 200
    galil = client.get("/companies/galil/months/2026-10").json()["entries"][0]
    galil_url = f"/companies/galil/months/2026-10/entries/{galil['employee_id']}"
    assert (
        client.put(galil_url, json=galil["entry"], headers=as_user("u-yossi")).status_code == 200
    )  # free
    assign = {"assignees": ["u-yossi"]}
    assert (
        client.put("/companies/galil/assignees", json=assign, headers=as_user("u-maya")).status_code
        == 403
    )
    assert (
        client.put(
            "/companies/galil/assignees", json=assign, headers=as_user("u-daniel")
        ).status_code
        == 200
    )
    assert client.put(galil_url, json=galil["entry"], headers=as_user("u-maya")).status_code == 403


def test_term_changes_are_recorded(client: TestClient) -> None:
    record = client.get("/companies/northwind/employees/northwind-001").json()
    record["employee"]["monthly_salary"] = "33000"
    record["standing"] = [s for s in record["standing"] if s["code"] != "MEAL_BENEFIT"]
    saved = client.put(
        "/companies/northwind/employees/northwind-001", json=record, headers={"X-User": "u-yossi"}
    )
    assert saved.status_code == 200
    changes = client.get("/companies/northwind/employees/northwind-001/changes").json()
    fields = {(c["field"], c["change"]) for c in changes}
    assert ("monthly_salary", "changed") in fields
    assert ("standing:MEAL_BENEFIT", "removed") in fields
    assert all(c["user_name"] == "יוסי ביטון" for c in changes)


def test_preview_does_not_save(client: TestClient) -> None:
    record = client.get("/companies/northwind/employees/northwind-001").json()
    record["employee"]["monthly_salary"] = "40000"
    result = client.post(
        "/companies/northwind/months/2026-10/preview/northwind-001", json={"record": record}
    ).json()
    assert float(result["after"]["bases"]["gross_cash"]) > float(
        result["before"]["bases"]["gross_cash"]
    )
    again = client.get("/companies/northwind/employees/northwind-001").json()
    assert again["employee"]["monthly_salary"] != "40000"


def test_base_reports(client: TestClient) -> None:
    for report in ("components", "imputed", "deductions", "costing", "funds", "absences"):
        rows = client.get(f"/companies/northwind/reports/{report}").json()["rows"]
        assert rows, report
        assert {"year", "month", "employee_number", "department", "company_name"} <= rows[0].keys()
    costing = client.get("/companies/northwind/reports/costing").json()["rows"]
    funds = client.get("/companies/northwind/reports/funds").json()["rows"]
    # Each fund's deposits add up to the payslips' deposits.
    total_funds = sum(float(r["total"]) for r in funds)
    total_costing = sum(float(r["funds_employee"]) + float(r["funds_employer"]) for r in costing)
    assert total_funds == pytest.approx(total_costing, abs=0.01)
    assert client.get("/companies/northwind/reports/unknown").status_code == 404


def test_year_data_and_liabilities(client: TestClient) -> None:
    year = client.get("/companies/northwind/years/2026/data").json()
    assert [m["period"]["month"] for m in year["months"]] == list(range(1, 11))
    assert year["months"][0]["payslips"][0]["trace"]["entries"] == []
    owed = client.get("/companies/northwind/months/2026-10/liabilities").json()
    assert len(owed) == 6
    assert all(float(o["severance_entitlement"]) > 0 for o in owed)
