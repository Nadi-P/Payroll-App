# Paypex: per-company database schema

## 1. Context
Paypex needs a database that stores one company's payroll completely and precisely. It must make auditing and analysis easy, and hold up from a few employees to 250 and beyond. Today the app keeps everything in one JSON file (`engine-api/dev-data/store.json`). That file can't enforce rules, keep an audit trail, or scale.

A payslip is a historical fact, so the database is an **archive**: what was agreed, what happened, what was calculated, what was paid and filed, and who did each thing. Reports read that archive and never recalculate it.

**Out of scope, stored elsewhere:** users and access rights (their own schema), the standard component list and the tax rules (shipped with the app, effective-dated, every version kept).

Nothing gets built until it is explicitly requested. The engine and app will be changed wherever the schema requires it (section 10).

## 2. Structure and conventions
- **Database:** Postgres, one server, one schema per legal company. A schema is a named set of tables, so each company gets its own copy of the 20 tables below. One legal company holds one or more deductions files.
- **Sections:** Setup, Input, Payslips, Records.
- **Keys:** every table has a UUID primary key. Business identifiers (employee number, file number, component code) are unique per company and never reused.
- **Links:** foreign keys everywhere inside the schema. Users live outside it, so every "who" field stores a user ID plus a copy of the name and role.
- **Money:** exact decimal, 2 places (agorot).
- **Rates:** exact decimal, 4 places.
- **Quantities and hours:** exact decimal, 4 places.
- **Floats:** never used.
- **Signs:** amounts are positive in their normal direction, and the line's kind says whether it adds or subtracts. Negative amounts appear only on reversals and corrections.
- **Time:**
  - Timestamps are stored in UTC.
  - Business dates are plain dates.
  - Months are stored as the first day of the month, and the tax year as a number.
  - Every payslip and line carries both, so time-series queries need no date arithmetic.
- **Choice fields:** kind, status and type fields use a fixed list of allowed values, checked by the database.
- **Flexible values:** blocks (structured data that doesn't fit a single value) are stored as JSON, and only for data that is read as a whole. Anything reported on gets a real column.
- **Never deleted:** no row is ever hard-deleted. Rows are voided or marked inactive. Everything is kept at least 7 years, with no automatic purging.

## 3. All tables
Volumes are rough estimates for 250 employees, assuming 50 leavers a year, ~40 lines per payslip (tax and contributions are now lines) and one deductions file. They are not measurements.

| # | Table | Section | Purpose | One row per | Expected volume |
|---|---|---|---|---|---|
| 1 | `company_settings` | Setup | The employer's details and payroll choices | The company | 1 row |
| 2 | `deductions_file` | Setup | Separates Form 102 filing and payments | Deductions file | 1–5 rows |
| 3 | `employee` | Setup | Identity that rarely changes | Person | 250, plus ~50 a year |
| 4 | `employment` | Setup | Stretches of work, rehires, termination settlements | Stretch of work | About one per employee |
| 5 | `employee_term` | Setup | Standing conditions and automatic lines, with full history | Employee, term, instance and start month | ~8,000 at start, ~1,500 a year |
| 6 | `company_component` | Setup | The company's own pay items, accounts and report groups | Custom component or standard-component override | 10–50 rows |
| 7 | `payee` | Setup | Everyone outside the company who receives money | Fund, union, enforcement office or other recipient | 5–30 rows |
| 8 | `department` | Setup | Stable reporting and cost split | Department | 5–30 rows |
| 9 | `pay_run` | Input | Status, approval and locking of a run | Deductions file, month and run number | 12–20 a year per file |
| 10 | `attendance_day` | Input | The day-by-day facts the engine calculates from | Employee, date and kind | Up to 66,000 a year |
| 11 | `opening_balance` | Input | Starting point for history kept outside Paypex | Employee, tax year and source | Up to 250 at onboarding, ~50 a year |
| 12 | `payslip` | Payslips | The frozen result for one employee in one run | Employee and pay run | ~3,000 a year |
| 13 | `payslip_line` | Payslips | All money, and what every report reads | Line on a payslip | ~120,000 a year |
| 14 | `payslip_flag` | Payslips | The exceptions page | Warning or error on a payslip | 3,000–6,000 a year |
| 15 | `payslip_evidence` | Payslips | Explains every number | Payslip | ~3,000 a year, largest in bytes |
| 16 | `correction` | Payslips | Why and how a past month was corrected | Corrected past payslip | Tens to a few hundred a year |
| 17 | `submission` | Records | Proves what was filed or paid | File or report produced | 150–300 a year |
| 18 | `document` | Records | Scans and exact filed files | Stored file | 500–1,500 a year |
| 19 | `change_log` | Records | Tamper-evident audit trail | Change | 5,000–20,000 a year |
| 20 | `schema_version` | Records | Tracks upgrades applied to this company | Database upgrade | A few a year |

**Scale:** ten times these volumes still works with ordinary indexed tables. No partitioning or summary tables are needed.

## 4. Table details

### Setup

**1. `company_settings`**: legal name, company number, address, tax method (monthly or cumulative), proration, recuperation month. Changes are logged, and a copy goes onto each pay run.

**2. `deductions_file`**: file number, Bituach Leumi file number, name, address, paying bank account, Masav details, active.

**3. `employee`**: employee number, ID type (Israeli ID or passport), ID number, first name, last name, birth date, gender.
- A name change updates this row, is logged, and old payslips keep their snapshot.
- Everything else about the person is a term.

**4. `employment`**: employee, start and end dates, seniority start (earlier than the start date when service carries over), end reason, entitled to severance, notice required, notice given, severance fund balances at termination per payee, settlement result for Form 161.

**5. `employee_term`**: employee, term code, instance, value, start month, reason, supporting document, who recorded it and when, who voided it and when.
- **Value:** one typed column is filled per row: number, text, yes/no, date, or block. The registry says which.
- **History:** a term runs until the next row with the same code and instance. Ending one is a row saying "none". Rows are added, never overwritten, and a mistake is voided.
- **Instances:** the instance lets one code exist more than once, such as two loans, several children or several funds.
- **Parameters**, which change a calculation:
  - **Pay:** employment kind, salary or hourly rate, job fraction, work week.
  - **Job:** department, position (job title), deductions file, income type.
  - **Personal:** bank account, contact details (email, phones, address).
  - **Form 101:**
    - marital status, spouse (name, ID number, birth date, income) and children
    - credit-point claims, immigration date, other income
    - tax coordination certificate, fixed rate
    - kibbutz member, health fund
  - **Insurance and calendar:** insurance category, holiday calendar, prior pension.
  - **Funds:** fund enrollments (payee, product, policy number, rates per part, salary share), Section 14.
  - **Benefits:** car, phone, travel rate.
- **Line generators**, which produce a line each active month:
  - recurring components
  - loans (principal, installment, interest terms)
  - garnishments (order reference, payee, total, protected amount)
- **Allowed codes:** parameter codes are a closed registry shipped in code, holding each code's type, validation and which ones are reportable. Line generators may use any component code.

**6. `company_component`**: code, names in all languages, kind (earning, benefit, deduction, employer contribution), flags (taxable, insurable, pension base, study fund base, severance base), report group (for example overtime, benefits, pension, statutory deductions), default payee, debit account, credit account, active. Once used, a component is never deleted and its code never reused.

**7. `payee`**: type (pension fund, manager's insurance, study fund, provident fund, union, enforcement office, other), name, official code, the company's account number with them, bank details for transfers, active. It replaces `fund_account`, because unions and enforcement offices also receive money.

**8. `department`**: code, name, accounting segment, active.

### Input

**9. `pay_run`**: deductions file, month, tax year, run number, run type (regular, off-cycle, termination), status (draft, approved, locked), settings snapshot.
- **Approval record:** who approved and when, line count and money totals at that moment, and a seal (a fingerprint of every payslip in the run).
- **Locking:** locked time.

**10. `attendance_day`**: employee, date, kind (worked, sick, vacation, holiday, miluim, unpaid, and more as needed), day fraction, hours, rest day, night, sick `episode_id`, note, who recorded it and when.
- Hours are stored for anyone whose company tracks them.
- When only monthly totals are typed, the totals sit on the payslip (see `month_inputs`), not here. No synthetic days are stored.
- It isn't tied to a run, because an illness can cross months.
- A date in a locked month can still be corrected, but only through a `correction`.

**11. `opening_balance`**: employee, tax year, source (previous employer, or previous payroll system of this same employer), `months_covered`, taxable income, tax paid and credits so far, prior 3 months' gross, vacation and sick days, remaining loans, provider name, as-of date, supporting document, approver.
- Both sources count toward tax and balances.
- Only "previous system, same employer" belongs in this company's Forms 106 and 126. "Previous employer" income belongs to that employer's forms.

### Payslips

**12. `payslip`**: created as a draft when the run opens.
- **Control:** employee, pay run, employment, status, input hash, calculated time, rule version, engine version, row version.
- **Approval seal:** a fingerprint of the payslip and its lines, so any later change is detectable.
- **Delivery:** sent time, channel, pay date, Masav batch.
- **Snapshot:**
  - **Employee:** name and ID number.
  - **Employer:** name, number and address.
  - **Job:** start date and seniority, job percentage, department, position, deductions file.
  - **Payment:** bank account.
  - **This month:** hours and days worked, leave used, minimum wage in force, vacation day value.
- **Totals:** gross, benefits, net pay, employer cost.
- **Bases:** taxable, insurable, pension, study fund, severance.
- **Tax detail:** bracket tax, surtax, credit points and amount, pension credit, months used for the cumulative method.
- **Balances:** insurance category, leave balances and accruals, reserve duty reimbursement.
- **`month_inputs` block:** the run's typed non-line inputs, kept across recalculation:
  - monthly totals in place of daily rows: total hours, sick day count
  - overrides: holiday days, daily wage, attendance days
  - balance corrections, each with a reason

**13. `payslip_line`**: every line, including income tax, Bituach Leumi, health tax, and employee and employer contributions.
- **Identity:** payslip, stable line ID, run, month, tax year, employee.
- **Component copy:** code, names in all languages, kind, flags, report group. These are copied so later component changes can't alter old reports.
- **Origin:**
  - source (generated, typed or correction) and term instance
  - payee, policy number, contribution part (employee, employer, severance, disability)
  - `for_period`, and `correction_id` for retro lines
- **Amounts:** base, quantity, rate, calculated amount, final amount, requested amount, priority, reason (required on typed changes to a generated amount).

**14. `payslip_flag`**: payslip, code, severity, message, who acknowledged it and when. An acknowledgement survives recalculation while the same code and message come back.

**15. `payslip_evidence`**: payslip, compressed input snapshot, calculation trace. It's kept apart so normal queries never load it.

**16. `correction`**: the payslip being corrected, reason, who requested it and when, the recalculation's evidence (its inputs, trace and result), the differences found, who approved it and when, the pay run where the differences were posted. Retro lines point back here.

### Records

**17. `submission`**: kind (102, 126, 106, 161, Masav, fund file, payee transfer), deductions file, month or tax year, payee, who produced it and when, stored file, the payslips it included, file hash, totals, status (produced, sent, accepted, rejected), outdated marker.

**18. `document`**: employee if any, kind (Form 101, tax coordination certificate, Section 14 letter, doctor's note, garnishment order, filed file, other), location, file hash, valid period, who uploaded it and when.
- Files live in file storage, with only the location and hash in the database.
- It stores scans and the exact files sent to authorities.
- Payslip PDFs aren't stored, because they can be rebuilt from the tables.

**19. `change_log`**: table, row, action, old values, new values, reason, who (ID, name, role), when, and a chain hash.
- **Who writes it:** database triggers, not the app, so nothing can skip it.
- **Tamper evidence:** each row's chain hash covers the previous row, so a deleted or altered entry is detectable.
- **Access:** the app's database login can add rows but never change or delete them.

**20. `schema_version`**: version, applied time, outcome.

## 5. How the data works

### A month's flow
1. Opening a run creates a draft payslip for each employee in it.
2. Users type one-off lines, monthly totals, overrides and attendance.
3. Calculation reads terms in force for the month, attendance, typed lines, `month_inputs` and that month's rules. It replaces generated lines only and never deletes typed ones.
4. A draft whose inputs changed since its last calculation can't be approved. Unacknowledged errors also block approval.
5. Approval seals the run and its payslips. An approved payslip counts as paid and is never reopened or edited.

### One-month exception
The user edits the number on the draft payslip. The line becomes typed, keeps the calculated amount beside the final one, requires a reason, and appears in the changes page. Terms stay untouched.

### Correcting a past month
1. Create a `correction` with a reason.
2. Recalculate the old month with that month's rules and the corrected inputs.
3. Compare it with the original. An engine bug fix can also show up here.
4. On approval, post the differences as retro lines in an open run, with `for_period` and `correction_id`. A same-month off-cycle run can pay them at once.

The original payslip stays exactly as issued.

### Several runs in a month
- Reports add up all of a month's runs.
- Closing balances come from the month's last run.
- Base salary is generated only in the regular run.
- Tax, the Bituach Leumi ceiling, credit points and leave accrual work on the month as a whole.

### Running totals
Year-to-date tax, leave and loan balances are summed from approved payslips plus `opening_balance`, never stored as counters.

### Bonus spreading and retro differences
- **Bonus:** the bonus line stays in the payment month. Its Bituach Leumi and health lines are stored per attributed month through `for_period`, each with its base, so each month's ceiling can be checked.
- **Retro differences:** taxed in the month paid by default. Bituach Leumi is attributed to the original month through `for_period`.

### Payments to others
Every line paid to someone other than the employee carries a payee: fund contributions, union fees, garnishments. Payee transfer files and fund files are built from those lines.

## 6. Auditing design
Any number can be answered with what, why, who and when:
- **What was paid:** sealed payslips and lines, copies of component definitions, snapshots of the employee as they were.
- **Why it is that number:** `payslip_evidence` holds inputs and trace, plus rule and engine versions. The rule versions are kept forever outside the schema.
- **Who changed what:** `change_log` is written by triggers, can't be edited, and is chained.
- **What was decided:** the `reason` on term rows, typed lines, overrides, voids and corrections. Flag acknowledgements.
- **What left the company:** `submission`, with the exact file, its hash and the payslips it included.
- **Detecting tampering:** run and payslip seals and the change-log chain can be re-verified at any time.
- **Read-only access for auditors:** a reporting login that can only read.

## 7. Analysis design
- **One reporting view:** lines from approved payslips, joined to the payslip snapshot. Month, tax year, employee, department, position, deductions file, component, report group, kind, payee and `for_period` are all directly filterable.
- **Pivots:** employees down, components across, months over time. Every pivot and export is a grouping over that view.
- **Ready-made dimensions:** report group, department, position, deductions file, payee, employment start and end (joiners and leavers), job percentage (full-time equivalents), hours.
- **Consistency checks:** at approval, net pay equals earnings minus deductions, and employer cost equals gross plus employer contributions. Both are checked as rules, so analysis can trust the totals.
- **Indexes on lines:** month, employee, component, report group, payee.

## 8. What the database itself enforces
- **Frozen rows:** approved rows can't change. A run can't move backwards from approved, and a draft can't be approved while out of date.
- **Uniqueness:**
  - one payslip per employee per run
  - one live term row per employee, term, instance and start month
  - one opening balance per employee, tax year and source
- **Valid values:** choice fields are checked, typed term values are checked, and money uses exact decimals with fixed precision.
- **Typed lines survive:** recalculation can't delete typed lines, enforced by the database and covered by a dedicated test.
- **Simultaneous edits:** draft rows carry a row version, so two people can't overwrite each other.
- **No deletes:** the app's login can't delete anything.

## 9. Operations
- **Database logins:**
  - **App:** reads and writes drafts, adds to the log.
  - **Reporting:** read only.
  - **Upgrades:** structural changes only.
  - Nobody uses an owner login day to day.
- **Backups:**
  - **Scope:** continuous backups that allow restoring to any moment, plus daily full backups.
  - **Restores:** restoring one company's schema on its own, tested regularly.
  - **Loss limit:** a defined maximum data loss.
- **Upgrades:** run company by company, recorded in `schema_version`, and safe to stop and resume after a failure.
- **Privacy:** ID numbers and bank details have no application-level encryption, by decision. Security is left to the hosting provider. Israeli privacy rules should be checked before real customer data goes in.

## 10. Changes required in the engine and app
- **Engine** (`payroll-engine/src/payroll_engine/`):
  - Several pension and study fund products with payee identity (`models/inputs.py`, `calculators/pension.py`).
  - Contributions, income tax, Bituach Leumi and health tax produced as lines, with payee and part (`pipeline.py`, `context.py`).
  - Section 14 read from term history (`termination.py`).
  - Typed lines replace generated lines of the same code. Today `_entered_lines` in `calculators/earnings.py` adds them, and `add_line` in `context.py` drops zero amounts.
  - Month-to-date handling across several runs. `annual.py` rejects duplicate months.
  - Bituach Leumi spreading of additional payments and attribution of wage differences to original months (`calculators/national_insurance.py`).
  - Forms 106 and 126 exclude previous-employer opening balances (`annual.py`).
- **API** (`engine-api/src/engine_api/`):
  - Replace the JSON store with this schema.
  - Remove reopening of approved months and the `previous` versions (`payroll_service.py`, `models.py`). Corrections replace them.
  - Keep `hours_total` and `sick_days_count` as `month_inputs` (`models.py`, `payroll_service.py`).
- **Web** (`web/src/screens/`):
  - Approval becomes final.
  - Corrections get their own flow.
  - Reasons are required where noted.

## 11. Legal research findings
- **Bonus spreading (National Insurance payment regulations 1995, regs 1, 4, 5):**
  - Threshold: an additional payment of 25% or more of the minimum wage is spread. The Nevo copy shows both "regular monthly wage" and "minimum wage" in one spot, so check the official text before coding the threshold.
  - Spreading: the payment is divided by 12 and added to the payment month and the 11 before it, or divided by months worked if fewer.
  - Below the threshold: the whole payment stays in the payment month.
  - Wage differences aren't additional payments.
- **Retro differences:** Bituach Leumi treats them as wages of the months they cover (reg 4). Income tax applies in the year of payment by default, and the employee may elect attribution of up to six tax years (Income Tax Ordinance s.8(c)).
- **Retention:** no explicit statutory period found for employers. Electronic payslip recipients must be able to get printed payslips for at least 7 years back, and 7 years is the common recommendation.
- **Payslip contents:** the snapshot fields follow Kol Zchut's summary of the Wage Protection Law supplement.

## 12. Still unconfirmed
None of these changes the tables.
- **Moving between deductions files:** whether the tax year-to-date carries over mid-year. One unofficial source says two Forms 106 may be issued.
- **Form 102 codes:** for bonus spreading and retro differences, found only in secondary sources.
- **Pension records:** whether they must be kept longer than 7 years.
- **Privacy:** what Israeli privacy rules require for this data.

## 13. Verification
**Done on paper:**
- **Engine:** inputs and outputs, plus the API's input model, compared with the schema. This added month totals, position, Form 101 personal data and spouse.
- **Payslip contents:** legally required fields compared with the snapshot.
- **Report walk:** every field has a source for 102, 126, 106, 161, Masav, fund files, payee transfers, payroll register, cost bridge, employee history, leave liability (this added the vacation day value), exceptions and the audit trail.
- **Traces:**
  - The 500,000 December bonus works: tax in December, Bituach Leumi lines per attributed month.
  - A mid-year joiner works, and showed opening balances need a source so Form 106 isn't wrong.

**To do once built:**
- **Test data:** load made-up data for 250 employees over three years. Run approvals, an off-cycle run, a correction, a termination, a mid-year joiner and a migrated company.
- **Reconciliation:**
  - check every seal and the change-log chain
  - check reports against payslip totals
  - restore one company from backup
- **Expert review:** a payroll accountant and a security specialist review the schema before real data goes in.

## 14. Notes for Claude, for the implementation session
Written so this file can be handed back to start the build.

**Starting state (as of 2026-11-06):**
- **Data:** everything lives in `engine-api/dev-data/store.json`. The current shape is firms, companies, employees (`profile`, `employee`, `standing`) and months (`entries`, `approved`, `sent`, `previous`).
- **Engine:** Python, in `payroll-engine/`. A Rust port is planned for later. Rule files sit under `payroll-engine/rules/`, effective-dated, and most are still marked `verified: false`.
- **API:** `engine-api/src/engine_api/`. `payroll_service.py` builds engine inputs, spreads `hours_total` and `sick_days_count` over work days (around line 120), and reopens approved months using `previous` (around lines 360–385).
- **Web:** Next.js in `web/`. `npm run check` runs typecheck, lint and `scripts/check-architecture.mjs`. That script requires no class strings in layout files, one component per file, no raw HTML in screens, and every translation key present in he/en/ar/ru.
- **Not a git repository yet.** Suggest `git init` before the build starts.

**Build order:**
1. Schema files with every constraint, trigger, login role and the change-log chain, plus an upgrade runner that tracks `schema_version` per company.
2. A generator for test data: 250 employees over three years, covering every case listed in section 13.
3. Engine changes from section 10, each with tests. Keep the existing test suites passing, including `tests/unit/test_no_floats.py`.
4. Replace the JSON store in the API, and migrate the dev data into the new schema.
5. Web changes: final approval, the corrections flow, required reasons.
6. Run the section 13 checks: seals, change-log chain, reports against totals, a restore drill.

**Engine details that will bite:**
- `_entered_lines` in `calculators/earnings.py` rejects deduction-kind lines and adds lines rather than replacing them.
- `add_line` in `context.py` drops zero amounts.
- `annual_summary` in `annual.py` rejects duplicate months.
- `PayslipInput.employee` is one `Employee` per input, so terms must be assembled into it for the month.
- The cumulative tax method needs `ytd.months`, which comes from `opening_balance.months_covered` plus the approved months.

**How this user works:**
- Explain in plain language. Give short, precise answers when asked, and sometimes in Hebrew.
- Confirm structural decisions before acting. The user makes decisions quickly and accepts engine changes.
- Back legal claims with official sources and say clearly when something is unverified. I already got one rule wrong from memory: the 25% bonus-spreading threshold is measured against the minimum wage, not the monthly wage.
- Ask before stopping or killing processes on their machine. Never claim a server or process is stopped without checking.
- Memory notes for this project live in `C:\Users\nadav\.claude\projects\C--Coding-Projects-Payroll-Software\memory\`.

**Still open when the build starts:** section 12, the bonus-threshold wording, and the privacy check.
