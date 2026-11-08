"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ApiError } from "@/api/client";
import { useAddCompany, usePortfolioRows, useSaveAssignees } from "@/api/queries";
import type { PortfolioRow } from "@/api/types.generated";
import { useRouter } from "@/i18n/navigation";
import { formatMonth } from "@/lib/format";
import { companyHref, useShellContext } from "@/screens/app-shell/logic/useShellContext";
import { payrollStatus, producedShare } from "@/screens/shared/logic/payrollStatus";

export type PortfolioView = "mine" | "free" | "all";

/** The firm's clients as a list: the user's own, the free ones, or (for managers) all. */
export function usePortfolioScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const ctx = useShellContext();
  const router = useRouter();
  const rows = usePortfolioRows(ctx.firm?.id);
  const assign = useSaveAssignees();
  const addCompany = useAddCompany(ctx.firm?.id ?? "");
  const [view, setView] = useState<PortfolioView>("mine");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFile, setNewFile] = useState("");

  const all = rows.data ?? [];
  const userId = ctx.user?.id;
  const assignees = (r: PortfolioRow) => r.summary.company.assignees ?? [];
  const mine = all.filter((r) => !!userId && assignees(r).includes(userId));
  const free = all.filter((r) => assignees(r).length === 0);
  const lists: Record<PortfolioView, PortfolioRow[]> = { mine, free, all };

  // Someone with no clients of their own starts on the free ones.
  useEffect(() => {
    if (rows.data && view === "mine" && mine.length === 0 && free.length > 0) setView("free");
    // Only when the data or user first arrives, not on every change of view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.data, userId]);

  const q = query.trim().toLowerCase();
  const shown = lists[view].filter(
    (r) => !q || r.summary.company.name.toLowerCase().includes(q) || r.summary.company.deductions_file.includes(q),
  );
  const userName = (id: string) => ctx.users.find((u) => u.id === id)?.name ?? id;

  return {
    t,
    loading: rows.isLoading,
    failed: rows.isError,
    retry: () => rows.refetch(),
    firmName: ctx.firm?.name ?? "",
    canManage: ctx.canManage,
    view,
    setView,
    counts: { mine: mine.length, free: free.length, all: all.length },
    query,
    setQuery,
    rows: shown.map((r) => {
      const c = r.summary;
      const status = payrollStatus(c);
      return {
        id: c.company.id,
        name: c.company.name,
        file: c.company.deductions_file,
        monthLabel: `${formatMonth(c.period.month, locale)} ${c.period.year}`,
        openEarlier: r.open_earlier.map((p) => `${formatMonth(p.month, locale)} ${p.year}`),
        employees: c.employees,
        produced: c.production.produced,
        expected: c.production.expected,
        share: producedShare(c),
        status,
        statusLabel: t(`portfolio.progress.${status.key}`),
        errors: c.errors,
        warnings: c.warnings,
        assignees: assignees(r).map((id) => ({ id, name: userName(id) })),
        href: companyHref(c.company.id, c.period, "payroll"),
        assignItems: ctx.users
          .filter((u) => u.role !== "viewer")
          .map((u) => ({
            id: u.id,
            label: u.name,
            hint: t(`roles.${u.role}`),
            checked: assignees(r).includes(u.id),
            onSelect: () => {
              const now = assignees(r);
              const next = now.includes(u.id) ? now.filter((x) => x !== u.id) : [...now, u.id];
              assign.mutate({ cid: c.company.id, assignees: next });
            },
          })),
      };
    }),
    open: (row: { href: string }) => router.push(row.href),
    add: {
      open: adding,
      show: () => {
        setNewName("");
        setNewFile("");
        addCompany.reset();
        setAdding(true);
      },
      close: () => setAdding(false),
      name: newName,
      setName: setNewName,
      file: newFile,
      setFile: setNewFile,
      canSave: !!newName.trim(),
      saving: addCompany.isPending,
      error: addCompany.error instanceof ApiError ? addCompany.error.detail : null,
      save: () =>
        addCompany.mutate(
          { name: newName.trim(), deductions_file: newFile.trim() },
          {
            onSuccess: (company) => {
              setAdding(false);
              router.push(companyHref(company.id, ctx.currentOf(company.id), "employees"));
            },
          },
        ),
    },
  };
}

export type PortfolioVM = ReturnType<typeof usePortfolioScreen>;
