"""Fictional demo data: one accounting firm, three client companies, January-September 2026
approved and October 2026 open as a draft (with one deliberate error to fix). galil also
keeps September open, to show a client with an earlier month still unclosed.

Five firm users with different roles; cafe and northwind are assigned, galil is free.

October shows the three production states: northwind has every payslip produced and sent,
galil some, cafe none."""

from __future__ import annotations

import random
from dataclasses import replace
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

from engine_api.funds import sync_funds
from engine_api.models import (
    Address,
    Company,
    EmployeeRecord,
    Firm,
    FundEnrollment,
    FundKind,
    HealthFund,
    IncomeType,
    MaritalStatus,
    MonthEntry,
    Plan,
    Profile,
    Role,
    Spouse,
    SpouseIncome,
    StandingLine,
    StoreData,
    User,
)
from engine_api.payroll_service import approve_month, employed_in, produce_month
from engine_api.store import DevStore
from payroll_engine.dates import Period, is_work_day
from payroll_engine.models import (
    Allowances,
    Balances,
    Child,
    CreditPointClaim,
    Deduction,
    Employee,
    EmployerSettings,
    EmploymentKind,
    Gender,
    LeaveInputs,
    PayLine,
    PensionProfile,
    SickDay,
    StudyFundProfile,
    TaxMethod,
    TaxProfile,
    WorkDay,
)
from payroll_engine.rules import RuleSet

DEMO_YEAR = 2026
APPROVED_MONTHS = range(1, 10)
OPEN_PERIOD = Period(DEMO_YEAR, 10)
LEFT_OPEN = Period(DEMO_YEAR, 9)  # galil has not closed September yet
M, F = Gender.MALE, Gender.FEMALE
MONTHLY, HOURLY = EmploymentKind.MONTHLY, EmploymentKind.HOURLY
STUDY = StudyFundProfile(Decimal("2.5"), Decimal("7.5"))
STREETS = ("הרצל", "דיזנגוף", "בן יהודה", "ויצמן", "הנביאים", "רוטשילד", "סוקולוב", "העצמאות")
CITIES = (
    ("תל אביב-יפו", "6100000"),
    ("חיפה", "3100000"),
    ("רמת גן", "5200000"),
    ("כרמיאל", "2100000"),
    ("נתניה", "4200000"),
    ("ירושלים", "9100000"),
)
FUNDS = (HealthFund.CLALIT, HealthFund.MACCABI, HealthFund.MEUHEDET, HealthFund.LEUMIT)
SPOUSE_NAMES = ("רונית", "אבי", "מיכל", "גיל", "ענבל", "אורן")


def _national_id(seed: int) -> str:
    """A fake 9-digit number with a valid Israeli ID check digit."""
    digits = [int(c) for c in f"{seed:08d}"]
    total = 0
    for i, d in enumerate(digits):
        x = d * (1 if i % 2 == 0 else 2)
        total += x // 10 + x % 10
    return f"{seed:08d}{(10 - total % 10) % 10}"


def _emp(
    company: str,
    n: int,
    first: str,
    last: str,
    gender: Gender,
    birth: str,
    start: str,
    kind: EmploymentKind,
    pay: str,
    department: str,
    position: str,
    married: bool = False,
    immigrated: str | None = None,
    **extra: object,
) -> EmployeeRecord:
    emp_id = f"{company}-{n:03d}"
    salary = Decimal(pay)
    employee = Employee(
        employee_id=emp_id,
        birth_date=date.fromisoformat(birth),
        gender=gender,
        start_date=date.fromisoformat(start),
        kind=kind,
        monthly_salary=salary if kind is MONTHLY else None,
        hourly_rate=salary if kind is HOURLY else None,
        pension=PensionProfile(),
    )
    employee = replace(employee, **extra)  # type: ignore[arg-type]
    seed = n * 31 + len(company) * 7
    city, zip_code = CITIES[seed % len(CITIES)]
    spouse = None
    if married:
        spouse = Spouse(
            first_name=SPOUSE_NAMES[seed % len(SPOUSE_NAMES)],
            last_name=last,
            national_id=_national_id(40_000_000 + seed * 977),
            birth_date=date.fromisoformat(birth) + timedelta(days=400 + seed * 13),
            income=SpouseIncome.WORK if seed % 3 else SpouseIncome.NONE,
        )
    profile = Profile(
        first_name=first,
        last_name=last,
        national_id=_national_id(30_000_000 + n * 7919 + len(company) * 101),
        department=department,
        position=position,
        email=f"{emp_id.lower()}@example.com",
        phone=f"03-{5_100_000 + seed * 4111:07d}",
        mobile=f"05{seed % 5}-{2_000_000 + seed * 73_331 % 7_000_000:07d}",
        address=Address(STREETS[seed % len(STREETS)], str(seed % 90 + 1), city, zip_code),
        marital_status=MaritalStatus.MARRIED if married else MaritalStatus.SINGLE,
        health_fund=FUNDS[seed % len(FUNDS)],
        spouse=spouse,
        income_type=IncomeType.MONTHLY if kind is MONTHLY else IncomeType.PARTIAL,
        immigration_date=date.fromisoformat(immigrated) if immigrated else None,
        other_income=(IncomeType.ADDITIONAL,)
        if extra.get("tax") and not getattr(extra["tax"], "main_employer", True)
        else (),
    )
    return EmployeeRecord(company, profile, employee)


def base_data() -> StoreData:
    firm = Firm("firm-1", "כהן ושות' - רואי חשבון (הדגמה)", Plan.MULTI)
    companies = (
        Company(
            "cafe",
            firm.id,
            'קפה דיזנגוף בע"מ',
            "937123456",
            EmployerSettings(recuperation_month=None),
        ),
        Company(
            "northwind",
            firm.id,
            "נורת'ווינד תוכנה בע\"מ",
            "937654321",
            EmployerSettings(recuperation_month=7),
        ),
        Company(
            "galil",
            firm.id,
            'גליל לוגיסטיקה בע"מ',
            "937111222",
            EmployerSettings(tax_method=TaxMethod.CUMULATIVE),
        ),
    )
    employees = (
        _emp(
            "cafe",
            1,
            "נועה",
            "לוי",
            F,
            "1998-03-12",
            "2023-02-01",
            HOURLY,
            "42",
            "שירות",
            "מלצרית",
            work_week=6,
        ),
        _emp(
            "cafe",
            2,
            "איתי",
            "מזרחי",
            M,
            "2001-07-30",
            "2024-06-15",
            HOURLY,
            "38",
            "מטבח",
            "טבח",
            work_week=6,
        ),
        _emp(
            "cafe",
            3,
            "יוסף",
            "חדד",
            M,
            "1985-11-02",
            "2019-09-01",
            MONTHLY,
            "11500",
            "הנהלה",
            "מנהל משמרת",
            married=True,
            work_week=6,
        ),
        _emp(
            "cafe",
            4,
            "דנה",
            "כהן",
            F,
            "1995-05-20",
            "2022-01-10",
            HOURLY,
            "45",
            "שירות",
            "ברמנית",
            work_week=6,
        ),
        _emp(
            "cafe",
            5,
            "אלכסנדר",
            "פטרוב",
            M,
            "1990-02-14",
            "2021-04-01",
            HOURLY,
            "40",
            "מטבח",
            "שף זוטר",
            immigrated="2014-08-20",
            work_week=6,
        ),
        _emp(
            "cafe",
            6,
            "שירה",
            "ברק",
            F,
            "2008-08-01",
            "2025-07-01",
            HOURLY,
            "36",
            "שירות",
            "מארחת",
            work_week=6,
        ),
        _emp(
            "northwind",
            1,
            "דניאל",
            "רוזן",
            M,
            "1987-01-09",
            "2018-03-01",
            MONTHLY,
            "32000",
            "פיתוח",
            "ראש צוות",
            married=True,
            study_fund=STUDY,
        ),
        _emp(
            "northwind",
            2,
            "מאיה",
            "גולן",
            F,
            "1992-10-03",
            "2020-11-15",
            MONTHLY,
            "24500",
            "מוצר",
            "מנהלת מוצר",
            married=True,
            study_fund=STUDY,
            tax=TaxProfile(children=(Child(date(2021, 4, 2)), Child(date(2024, 1, 20)))),
        ),
        _emp(
            "northwind",
            3,
            "עומר",
            "שגיא",
            M,
            "1996-04-22",
            "2023-08-01",
            MONTHLY,
            "18000",
            "פיתוח",
            "מפתח",
            study_fund=STUDY,
        ),
        _emp(
            "northwind",
            4,
            "תמר",
            "אלון",
            F,
            "1984-06-30",
            "2016-01-04",
            MONTHLY,
            "41000",
            "הנהלה",
            'סמנכ"לית כספים',
            married=True,
            study_fund=STUDY,
            tax=TaxProfile(
                children=(
                    Child(date(2012, 9, 1)),
                    Child(date(2015, 3, 3)),
                    Child(date(2019, 7, 7)),
                ),
                claims=(
                    CreditPointClaim(
                        "ACADEMIC_DEGREE", Decimal("1"), date(2026, 1, 1), date(2026, 12, 31)
                    ),
                ),
            ),
        ),
        _emp(
            "northwind",
            5,
            "רועי",
            "ביטון",
            M,
            "1999-12-12",
            "2025-02-01",
            MONTHLY,
            "14000",
            "תמיכה",
            "נציג תמיכה",
        ),
        _emp(
            "northwind",
            6,
            "ליה",
            "שחר",
            F,
            "2000-09-09",
            "2024-09-01",
            MONTHLY,
            "12500",
            "שיווק",
            "רכזת שיווק",
            job_fraction=Decimal("0.8"),
        ),
        _emp(
            "galil",
            1,
            "משה",
            "אזולאי",
            M,
            "1975-03-03",
            "2010-05-01",
            MONTHLY,
            "15800",
            "תפעול",
            "מנהל מחסן",
            married=True,
            tax=TaxProfile(children=(Child(date(2009, 2, 2)),)),
        ),
        _emp(
            "galil",
            2,
            "אורית",
            "נחום",
            F,
            "1980-12-24",
            "2014-02-01",
            MONTHLY,
            "13200",
            "כספים",
            "מנהלת חשבונות",
            married=True,
        ),
        _emp(
            "galil",
            3,
            "ויקטור",
            "קוזלוב",
            M,
            "1968-07-07",
            "2012-10-01",
            HOURLY,
            "52",
            "הפצה",
            "נהג משאית",
            married=True,
            immigrated="1991-03-11",
        ),
        _emp(
            "galil",
            4,
            "יעל",
            "פרץ",
            F,
            "1993-01-15",
            "2026-05-01",
            MONTHLY,
            "9800",
            "תפעול",
            "רכזת משלוחים",
            pension=None,
        ),
        _emp(
            "galil",
            5,
            "אבי",
            "דהן",
            M,
            "1989-08-18",
            "2021-06-01",
            HOURLY,
            "47",
            "הפצה",
            "נהג",
            tax=TaxProfile(main_employer=False),
        ),
    )
    former = (
        _emp(
            "cafe",
            7,
            "עדי",
            "שמעוני",
            F,
            "2003-04-04",
            "2024-03-01",
            HOURLY,
            "37",
            "שירות",
            "מלצרית",
            work_week=6,
            end_date=date(2026, 6, 30),
        ),
        _emp(
            "northwind",
            7,
            "גיא",
            "פרידמן",
            M,
            "1994-02-17",
            "2022-05-01",
            MONTHLY,
            "21000",
            "פיתוח",
            "מפתח",
            study_fund=STUDY,
            end_date=date(2026, 8, 31),
        ),
        _emp(
            "galil",
            6,
            "סהר",
            "בן דוד",
            M,
            "1997-11-11",
            "2023-01-15",
            HOURLY,
            "44",
            "הפצה",
            "נהג",
            end_date=date(2026, 4, 30),
        ),
    )
    users = (
        User("u-ronit", firm.id, "רונית כהן", "ronit@example.com", Role.ADMIN),
        User("u-daniel", firm.id, "דניאל אברהם", "daniel@example.com", Role.LEAD),
        User("u-maya", firm.id, "מאיה שפירא", "maya@example.com", Role.ACCOUNTANT),
        User("u-yossi", firm.id, "יוסי ביטון", "yossi@example.com", Role.ACCOUNTANT),
        User("u-shira", firm.id, "שירה נחום", "shira@example.com", Role.VIEWER),
    )
    assigned = {"cafe": ("u-maya",), "northwind": ("u-yossi", "u-maya")}
    return StoreData(
        firms=(firm,),
        companies=tuple(replace(c, assignees=assigned.get(c.id, ())) for c in companies),
        employees=tuple(_enrich(r) for r in employees + former),
        users=users,
    )


SUB_DEPARTMENTS = {
    "פיתוח": ("צד שרת", "צד לקוח"),
    "שירות": ("אולם", "בר"),
    "הפצה": ("צפון", "מרכז"),
}
PENSION_FUNDS = (
    ("512947", "מנורה מבטחים פנסיה", FundKind.PENSION),
    ("514015", "הראל פנסיה וגמל", FundKind.PENSION),
    ("660110", "מגדל ביטוח מנהלים", FundKind.MANAGERS_INSURANCE),
)
STUDY_FUND = ("513173", "אלטשולר שחם השתלמות", FundKind.STUDY_FUND)


def _enrich(record: EmployeeRecord) -> EmployeeRecord:
    """Give a demo employee a sub-department, fund enrollments and, for some, standing lines."""
    n = int(record.employee.employee_id.split("-")[-1])
    seed = n * 13 + len(record.company_id)
    subs = SUB_DEPARTMENTS.get(record.profile.department)
    profile = replace(record.profile, sub_department=subs[seed % 2] if subs else "")

    code, name, kind = PENSION_FUNDS[seed % len(PENSION_FUNDS)]
    member = f"{7_100_000 + seed * 3_917:07d}"
    funds: list[FundEnrollment] = []
    if kind is FundKind.MANAGERS_INSURANCE:
        # Managers' insurance: savings plus loss-of-work-capacity cover paid by the employer.
        funds.append(
            FundEnrollment(
                code,
                name,
                kind,
                member,
                "001",
                "1",
                employee_rate=Decimal("6"),
                employer_rate=Decimal("5"),
                severance_rate=Decimal("8.33"),
                disability_employer_rate=Decimal("1.5"),
            )
        )
    elif seed % 4 == 0 and record.employee.kind is MONTHLY:
        # Split between two pension funds, 60/40.
        other_code, other_name, _ = PENSION_FUNDS[(seed + 1) % 2]
        funds.append(
            FundEnrollment(code, name, kind, member, "002", "2", salary_share=Decimal("60"))
        )
        funds.append(
            FundEnrollment(
                other_code,
                other_name,
                FundKind.PENSION,
                f"{member[:-1]}9",
                "002",
                "2",
                salary_share=Decimal("40"),
                other_employee_rate=Decimal("0.5"),
            )
        )
    else:
        funds.append(FundEnrollment(code, name, kind, member, "001", "1"))
    if record.employee.study_fund is not None:
        s_code, s_name, s_kind = STUDY_FUND
        funds.append(
            FundEnrollment(
                s_code,
                s_name,
                s_kind,
                f"{8_200_000 + seed * 211:07d}",
                "001",
                "3",
                employee_rate=record.employee.study_fund.employee_rate,
                employer_rate=record.employee.study_fund.employer_rate,
            )
        )
    if record.employee.pension is None:
        funds = [f for f in funds if f.kind is FundKind.STUDY_FUND]

    standing: list[StandingLine] = list(record.standing)
    if seed % 5 == 1:
        standing.append(StandingLine("LOAN_REPAYMENT", Decimal("750"), valid_from=date(2026, 2, 1)))
    if record.company_id == "northwind":
        standing.append(StandingLine("MEAL_BENEFIT", Decimal("420")))
    return replace(record, profile=profile, funds=tuple(funds), standing=tuple(standing))


def _holidays(rules: RuleSet, period: Period) -> set[date]:
    calendars = rules.at(period.last_day).value("calendar.holidays")
    days = [*calendars.get("general", []), *calendars["jewish"]]
    return {date.fromisoformat(h["date"]) for h in days}


def _entry(
    record: EmployeeRecord,
    period: Period,
    rules: RuleSet,
    rng: random.Random,
    previous: Balances | None = None,
    prior_gross: Decimal | None = None,
) -> MonthEntry:
    emp = record.employee
    holidays = _holidays(rules, period)
    start = max(period.first_day, emp.start_date)
    days = [
        start + timedelta(days=i)
        for i in range((period.last_day - start).days + 1)
        if is_work_day(start + timedelta(days=i), emp.work_week)
        and start + timedelta(days=i) not in holidays
    ]
    sick: tuple[SickDay, ...] = ()
    if rng.random() < 0.2 and len(days) > 10:
        first = rng.randrange(0, len(days) - 3)
        sick = tuple(SickDay(days[first + i], i + 1) for i in range(rng.randint(1, 3)))
    sick_days = {s.day for s in sick}
    worked = [d for d in days if d not in sick_days]

    timesheet: tuple[WorkDay, ...] = ()
    if emp.kind is HOURLY:
        timesheet = tuple(
            WorkDay(d, Decimal(rng.choice(["7", "8", "8", "8.5", "9", "9.5", "10"])))
            for d in worked
        )
    lines: list[PayLine] = []
    if rng.random() < 0.15:
        lines.append(PayLine("BONUS", Decimal(rng.choice(["500", "1000", "1500", "2500"]))))
    if period.month in (4, 9):  # holiday gifts before Passover and Rosh Hashana
        lines.append(PayLine("GIFT_BENEFIT", Decimal(rng.choice(["300", "450", "600"]))))
    deductions: list[Deduction] = []
    if record.company_id == "galil":
        deductions.append(Deduction("UNION_FEE", Decimal("38"), priority=10))
    if rng.random() < 0.08:
        deductions.append(
            Deduction("SALARY_ADVANCE", Decimal(rng.choice(["1000", "1500", "2000"])), priority=20)
        )
    vacation_used = Decimal(0)
    if emp.kind is MONTHLY and rng.random() < 0.3:
        vacation_used = Decimal(rng.choice(["1", "2", "3", "5"]))
    reserve_days = 0
    if emp.gender is M and prior_gross is not None and rng.random() < 0.06:
        reserve_days = rng.randint(2, 6)
    # Balances carry on from the previous month; a few get a one-time correction.
    vacation_opening = previous.vacation if previous else Decimal("8")
    sick_opening = previous.sick if previous else Decimal("12")
    # northwind pays recuperation once a year, in July: in January half a year is already owed.
    first_recuperation = Decimal("3") if record.company_id == "northwind" else Decimal(0)
    recuperation_opening = previous.recuperation if previous else first_recuperation
    vacation_adjustment = Decimal("2") if previous is None and rng.random() < 0.2 else Decimal(0)
    car = None
    car_type = None
    if emp.employee_id == "northwind-001":
        car, car_type = Decimal("220000"), "electric"
    if emp.employee_id == "northwind-004":
        car, car_type = Decimal("260000"), "hybrid"
    return MonthEntry(
        lines=tuple(lines),
        timesheet=timesheet,
        leave=LeaveInputs(
            sick_opening=sick_opening,
            vacation_opening=vacation_opening,
            sick_days=sick,
            vacation_days_used=vacation_used,
            reserve_days=reserve_days,
            prior_three_months_gross=prior_gross if reserve_days else None,
            vacation_adjustment=vacation_adjustment,
            recuperation_opening=recuperation_opening,
        ),
        allowances=Allowances(
            travel_daily_cost=Decimal(rng.choice(["11", "14.5", "18", "22.6", "30"])),
            attendance_days=len(worked),
            car_list_price=car,
            car_type=car_type,
            mobile_phone=record.company_id == "northwind",
        ),
        deductions=tuple(deductions),
    )


def seed_store(path: Path, rules: RuleSet) -> DevStore:
    """Open the store at `path`, creating and populating the demo data if it does not exist."""
    existed = path.exists()
    store = DevStore(path, base_data)
    if existed:
        return store
    rng = random.Random(2026)
    store.update(
        lambda data: replace(
            data,
            employees=tuple(sync_funds(r, rules, date(DEMO_YEAR, 1, 31)) for r in data.employees),
        )
    )
    periods = [Period(DEMO_YEAR, m) for m in APPROVED_MONTHS] + [OPEN_PERIOD]
    for company in store.data.companies:
        closing: dict[str, Balances] = {}
        grosses: dict[str, list[Decimal]] = {}
        for period in periods:
            for record in store.employees(company.id):
                if employed_in(record, period):
                    emp_id = record.employee.employee_id
                    store.save_entry(
                        company.id,
                        period,
                        emp_id,
                        _entry(
                            record,
                            period,
                            rules,
                            rng,
                            closing.get(emp_id),
                            sum(grosses[emp_id][-3:], Decimal(0))
                            if len(grosses.get(emp_id, [])) >= 3
                            else None,
                        ),
                    )
            if period == OPEN_PERIOD or (company.id, period) == ("galil", LEFT_OPEN):
                continue
            produce_month(store, rules, company.id, period)
            result = approve_month(store, rules, company.id, period)
            closing = {p.employee_id: p.balances for p in result.payslips}
            for p in result.payslips:
                grosses.setdefault(p.employee_id, []).append(p.bases.gross_cash)
    produce_month(store, rules, "northwind", OPEN_PERIOD)
    galil = store.month("galil", OPEN_PERIOD)
    done = tuple(e.employee_id for e in galil.entries if e.employee_id != "galil-004")[:3]
    store.save_month(replace(galil, produced=done, sent=done[:2]))
    return store
