# Paypex UI overhaul (agreed 2026-11-07/08)

Working checklist for the big flow change. Ticked items are built and checked.

## Data
- [x] Engine: pension profile gains disability (א. כושר) and other (שונות) rates, employee and employer; contributions carry them; they count in net pay and employer cost.
- [x] Engine: leave balances report opening, one-time load, accrual, usage and closing for vacation, sick and recuperation, plus reserve-duty days.
- [x] API: provident fund enrollments per employee (code, name, type, member no., branch, group, salary share, all rates). Engine pension/study profiles are derived from them.
- [x] API: profile sub-department; organisation tax = UNION_FEE, advance = SALARY_ADVANCE.
- [x] API: users with roles (admin, lead, accountant, viewer), company assignees, `X-User` header, permission checks on writes.
- [x] API: employment-term change history (what changed, old, new, when, who).
- [x] API: open months per company: current month = latest month, or the next one if the latest is approved; earlier drafts are "open".
- [x] API: portfolio rows per company at its own current month, with open earlier months and assignees.
- [x] API: preview one employee's month with unsaved changes (simulation).
- [x] API: the 6 base reports as flat rows over all approved months (Shiklulit headers).
- [x] Seed data covers every new field.

## Web
- [x] Shell: no top bar. Sidebar holds company switcher and search; language + theme on one row above simulator/rules; user switcher until sign-in exists.
- [x] Sidebar: "Regulatory reports / דוחות רגולטוריים"; no month dropdown anywhere.
- [x] Portfolio: vertical list, "My clients / Free clients" toggle, name, active employees, payslip progress, status, errors/warnings, open-month notice, assignee tags (admins and leads can assign).
- [x] Payroll month: progress + status, 6 tiles, alert sentence (red if any error, amber if only warnings), 5-section table (payments, imputed income, voluntary deductions, social funds, absences) with row colors; open-month selector when earlier months are open; side payslip summary removed.
- [x] Employee month page: payslip summary, breakdown chart switchable by section with filter, alerts, link to profile, entry for all 5 sections, table of the month's data, link to simulation.
- [x] Simulation page: edit a copy, see before/after for the employee and the month, save or discard.
- [x] Employee profile: rework; no termination button; big button to the employee's current month page; menu: Details (incl. tax), Employment terms (incl. pension and funds), History (payslips + term changes).
- [x] Data history: card gallery of the 6 base reports; report view with Table / Pivot / Analysis; column side panel (freeze, filter, move, hide, 3-state sort, conditional formatting, duplicates), totals, saved layouts, Excel export; pivot drag and drop. Ported from Verisal.
- [x] Remove the old data-history code.
- [x] Permissions in the UI: viewers read only; accountants edit assigned and free clients.

## Notes
- "ע. ע. סכומים" in the funds report: meaning unconfirmed; stored as a free-text field on the fund enrollment until the user confirms.
- Foreign-resident BL exemption (פטור ב.ל. ת.חוץ): the column exists; the engine does not yet apply the non-resident rule, so it shows 0. Needs legal research.
- Reserves (עתודות) are accounting estimates: severance = severance base x 8.33%, vacation = days earned x daily value, recuperation = days earned x day value.

## Status (2026-11-08)
Everything above is built; engine, API and web checks all pass (engine and API tests, ruff, mypy, typecheck, lint, architecture).
Still to do: restart the API (it loads code and the demo store at start-up) and regenerate dev-data/store.json from the
new seed, then check every screen in the browser.

## Where things are
- Data history tooling (ported from Verisal): `web/src/components/data/report-view/` (table, pivot, side panel, Excel export).
- Base reports: API `engine-api/src/engine_api/reports.py`; web `web/src/screens/data-history/`.
- Shared month editors: `web/src/screens/shared/month-entry/`; shared terms editors: `web/src/screens/shared/terms/`.
- Users and permissions: API `app.py` (`X-User` header); web `web/src/lib/currentUser.ts`, `useShellContext().canEdit`.
