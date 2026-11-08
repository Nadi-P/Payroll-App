"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useEmployees } from "@/api/queries";
import type { SidebarSection } from "@/components/navigation/sidebar/Sidebar";
import type { CommandGroup } from "@/components/overlays/command-palette/CommandPalette";
import { useRouter } from "@/i18n/navigation";
import { companyHref, type ShellContext } from "./useShellContext";
import type { usePreferences } from "./usePreferences";

export function useCommands(ctx: ShellContext, nav: SidebarSection[], prefs: ReturnType<typeof usePreferences>) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const employees = useEmployees(ctx.fallbackCompanyId ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups: CommandGroup[] = [
    {
      id: "pages",
      heading: t("palette.groups.pages"),
      items: nav.flatMap((section) =>
        section.items.map((item) => ({
          id: item.id,
          label: item.label,
          icon: item.icon,
          hint: section.title,
          onSelect: () => router.push(item.href),
        })),
      ),
    },
    {
      id: "companies",
      heading: t("palette.groups.companies"),
      items: ctx.companies.map(({ summary: c }) => ({
        id: c.company.id,
        label: c.company.name,
        icon: "building" as const,
        onSelect: () => router.push(companyHref(c.company.id, c.period, ctx.section ?? "payroll")),
      })),
    },
    {
      id: "employees",
      heading: t("palette.groups.employees"),
      items: (employees.data ?? []).map((e) => ({
        id: e.employee.employee_id,
        label: `${e.profile.first_name} ${e.profile.last_name}`,
        hint: e.profile.position,
        icon: "user" as const,
        keywords: [e.profile.national_id, e.employee.employee_id],
        onSelect: () =>
          ctx.fallbackCompanyId &&
          router.push(companyHref(ctx.fallbackCompanyId, ctx.period, "employees", `/${e.employee.employee_id}`)),
      })),
    },
    {
      id: "actions",
      heading: t("palette.groups.actions"),
      items: [
        { id: "theme", label: t("palette.actions.toggleTheme"), icon: "moon" as const, onSelect: prefs.toggleTheme },
        ...prefs.languageItems.map((l) => ({
          id: `lang-${l.id}`,
          label: t("palette.actions.language", { name: l.label }),
          icon: "languages" as const,
          onSelect: l.onSelect,
        })),
      ],
    },
  ];

  return { open, setOpen, groups };
}
