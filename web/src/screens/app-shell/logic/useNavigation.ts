"use client";

import { useTranslations } from "next-intl";
import type { SidebarSection } from "@/components/navigation/sidebar/Sidebar";
import { companyHref, type CompanySection, type ShellContext } from "./useShellContext";

const COMPANY_ITEMS: { section: CompanySection; icon: SidebarSection["items"][number]["icon"] }[] = [
  { section: "payroll", icon: "wallet" },
  { section: "employees", icon: "users" },
  { section: "exceptions", icon: "list-checks" },
  { section: "corrections", icon: "history" },
  { section: "reports", icon: "file-check" },
  { section: "data-history", icon: "bar-chart" },
  { section: "settings", icon: "settings" },
];

/** Sidebar sections. `pendingPath` is a page being opened: it is highlighted before it loads. */
export function useNavigation(ctx: ShellContext, pendingPath: string | null): SidebarSection[] {
  const t = useTranslations();
  const { period, current, fallbackCompanyId } = ctx;
  const pathname = pendingPath ?? ctx.pathname;
  const section = /^\/c\/[^/]+\/[^/]+\/([^/]+)/.exec(pathname)?.[1] ?? null;
  const errors = current?.errors ?? 0;

  // Inside a company, pages keep the month being viewed; from elsewhere, its current month.
  const month = ctx.companyId ? period : ctx.currentOf(fallbackCompanyId);
  const companyItems = fallbackCompanyId
    ? COMPANY_ITEMS.map(({ section: s, icon }) => ({
        id: s,
        href: companyHref(fallbackCompanyId, month, s),
        label: t(`nav.${s === "data-history" ? "dataHistory" : s}`),
        icon,
        active: section === s,
        count: s === "exceptions" && errors ? errors : undefined,
        countTone: "danger" as const,
      }))
    : [];

  return [
    ...(ctx.multiCompany
      ? [
          {
            id: "workspace",
            title: t("nav.sections.workspace"),
            items: [{ id: "portfolio", href: "/", label: t("nav.portfolio"), icon: "dashboard" as const, active: pathname === "/" }],
          },
        ]
      : []),
    { id: "company", title: current?.company.name ?? t("nav.sections.company"), items: companyItems },
    {
      id: "later",
      title: t("nav.sections.later"),
      items: (["migration", "assistant", "portal", "loader"] as const).map((id) => ({
        id,
        href: `/${id}`,
        label: t(`nav.${id}`),
        icon: (
          { migration: "upload", assistant: "sparkles", portal: "smartphone", loader: "hourglass" } as const
        )[id],
        active: pathname === `/${id}`,
        soonLabel: t("nav.soon"),
      })),
    },
  ];
}

/** Internal tools, tucked into the sidebar footer until they are removed from the product. */
export function useInternalTools() {
  const t = useTranslations();
  return [
    { id: "simulator", href: "/simulator", label: t("nav.simulator"), icon: "calculator" as const },
    { id: "rules", href: "/rules", label: t("nav.rules"), icon: "scale" as const },
  ];
}
