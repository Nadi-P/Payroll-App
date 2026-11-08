"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { setUserId } from "@/lib/currentUser";
import { useCommands } from "./useCommands";
import { useInternalTools, useNavigation } from "./useNavigation";
import { usePageTransitions } from "./usePageTransitions";
import { usePreferences } from "./usePreferences";
import { companyHref, useShellContext } from "./useShellContext";

/** Everything the shell layout shows, in one view model. */
export function useAppShell() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ctx = useShellContext();
  const transition = usePageTransitions(ctx.pathname);
  const nav = useNavigation(ctx, transition.toPath);
  const tools = useInternalTools();
  const prefs = usePreferences();
  const commands = useCommands(ctx, nav, prefs);
  const [menuOpen, setMenuOpen] = useState(false);

  const companyOptions = ctx.companies.map((c) => ({
    id: c.summary.company.id,
    label: c.summary.company.name,
    selected: c.summary.company.id === ctx.companyId,
  }));

  return {
    t,
    nav,
    tools,
    prefs,
    commands,
    menuOpen,
    /** Page transition phase, for the content area (see lib/pageTransition). */
    phase: transition.phase,
    pageLoading: transition.loading,
    openMenu: () => setMenuOpen(true),
    closeMenu: () => setMenuOpen(false),
    showCompany: ctx.companies.length > 0,
    companyLabel: ctx.current?.company.name ?? t("shell.chooseCompany"),
    companyOptions,
    // Another company opens at its own current month.
    selectCompany: (id: string) => router.push(companyHref(id, ctx.currentOf(id), ctx.section ?? "payroll")),
    user: ctx.user,
    userRole: ctx.user ? t(`roles.${ctx.user.role}`) : "",
    userOptions: ctx.users.map((u) => ({
      id: u.id,
      name: u.name,
      role: t(`roles.${u.role}`),
      selected: u.id === ctx.user?.id,
    })),
    selectUser: (id: string) => {
      setUserId(id);
      void queryClient.invalidateQueries();
    },
  };
}
