"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useFirms, useOpenMonths, usePortfolioRows, useUsers } from "@/api/queries";
import type { Period } from "@/api/types.generated";
import { usePathname } from "@/i18n/navigation";
import { useUserId } from "@/lib/currentUser";
import { defaultPeriod, parsePeriod, periodKey } from "@/lib/period";

/** The section a company-scoped page lives in, e.g. "payroll" in /c/cafe/2026-10/payroll. */
export type CompanySection =
  | "payroll"
  | "employees"
  | "exceptions"
  | "termination"
  | "corrections"
  | "reports"
  | "data-history"
  | "settings";

export function companyHref(companyId: string, period: Period, section: CompanySection, rest = "") {
  return `/c/${encodeURIComponent(companyId)}/${periodKey(period)}/${section}${rest}`;
}

/**
 * Where the app stands: firm, signed-in user, company and month. Each company works on its own
 * current month (or an earlier one still open); other months are seen only in Data history.
 */
export function useShellContext() {
  const params = useParams<{ companyId?: string; period?: string }>();
  const pathname = usePathname();
  const firms = useFirms();
  const firm = firms.data?.[0];
  const rows = usePortfolioRows(firm?.id);
  const users = useUsers(firm?.id);
  const userId = useUserId();
  const companyId = params.companyId ? decodeURIComponent(params.companyId) : undefined;
  const openMonths = useOpenMonths(companyId ?? "");

  const section = useMemo(() => {
    const match = /^\/c\/[^/]+\/[^/]+\/([^/]+)/.exec(pathname);
    return (match?.[1] as CompanySection | undefined) ?? null;
  }, [pathname]);

  const companies = rows.data ?? [];
  const row = companies.find((c) => c.summary.company.id === companyId);
  const fallbackCompanyId = companyId ?? companies[0]?.summary.company.id;
  const currentOf = (id: string | undefined) =>
    companies.find((c) => c.summary.company.id === id)?.summary.period ?? defaultPeriod();
  const period = parsePeriod(params.period) ?? currentOf(fallbackCompanyId);

  // Single-company subscriptions have no firm portfolio.
  const multiCompany = (firm?.plan ?? "multi") === "multi";
  const user = users.data?.find((u) => u.id === userId);

  return {
    pathname,
    firm,
    multiCompany,
    user,
    users: users.data ?? [],
    period,
    companies,
    /** The open company at its current month (name, file, counts). */
    current: row?.summary,
    currentRow: row,
    companyId,
    fallbackCompanyId,
    section,
    /** The open company's working month and every month still open, oldest first. */
    openMonths: openMonths.data,
    /** Where a company's pages start: its current month. */
    currentOf,
    /** Whether this user may change this company's data (the API enforces the same rule). */
    canEdit: (id: string | undefined = companyId) => {
      if (!user) return true;
      if (user.role === "admin" || user.role === "lead") return true;
      if (user.role === "viewer") return false;
      const assignees = companies.find((c) => c.summary.company.id === id)?.summary.company.assignees ?? [];
      return assignees.length === 0 || assignees.includes(user.id);
    },
    canManage: !user || user.role === "admin" || user.role === "lead",
  };
}

export type ShellContext = ReturnType<typeof useShellContext>;
