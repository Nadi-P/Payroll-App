"use client";

import type { ReactNode } from "react";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { TextLink } from "@/components/actions/text-link/TextLink";
import { Logo } from "@/components/brand/logo/Logo";
import { PageLoader } from "@/components/feedback/page-loader/PageLoader";
import { ContextSwitcher } from "@/components/navigation/context-switcher/ContextSwitcher";
import { LanguageSwitcher } from "@/components/navigation/language-switcher/LanguageSwitcher";
import { SearchTrigger } from "@/components/navigation/search-trigger/SearchTrigger";
import { Sidebar } from "@/components/navigation/sidebar/Sidebar";
import { UserSwitcher } from "@/components/navigation/user-switcher/UserSwitcher";
import { CommandPalette } from "@/components/overlays/command-palette/CommandPalette";
import { DropdownMenu } from "@/components/overlays/dropdown-menu/DropdownMenu";
import { appShellStyles as s } from "./appShell.styles";
import { useAppShell } from "./logic/useAppShell";

export function AppShell({ children }: { children: ReactNode }) {
  const vm = useAppShell();
  const { t } = vm;
  return (
    <div className={s.root}>
      <Sidebar
        ariaLabel={t("shell.sidebar")}
        open={vm.menuOpen}
        onClose={vm.closeMenu}
        sections={vm.nav}
        brand={<Logo name={t("app.name")} />}
        header={
          <>
            {vm.showCompany ? (
              <ContextSwitcher
                icon="building"
                caption={t("shell.company")}
                value={vm.companyLabel}
                options={vm.companyOptions}
                onSelect={vm.selectCompany}
              />
            ) : null}
            <SearchTrigger label={t("shell.search")} shortcut={t("shell.searchShortcut")} onPress={() => vm.commands.setOpen(true)} />
          </>
        }
        footer={
          <>
            <div className={s.prefs}>
              <div className={s.language}>
                <LanguageSwitcher label={t("shell.language")} languages={vm.prefs.languageItems} />
              </div>
              <DropdownMenu
                align="end"
                label={t("shell.theme.label")}
                items={vm.prefs.themeItems}
                trigger={<IconButton icon={vm.prefs.themeIcon} label={t("shell.theme.label")} />}
              />
            </div>
            <div className={s.tools}>
              {vm.tools.map((tool) => (
                <TextLink key={tool.id} href={tool.href} label={tool.label} icon={tool.icon} tone="muted" />
              ))}
            </div>
            {vm.user ? (
              <UserSwitcher
                label={t("shell.user")}
                name={vm.user.name}
                role={vm.userRole}
                users={vm.userOptions}
                onSelect={vm.selectUser}
              />
            ) : null}
          </>
        }
      />
      <div className={s.main}>
        <div className={s.mobileBar}>
          <IconButton icon="panel-start" label={t("shell.openMenu")} onPress={vm.openMenu} />
          <Logo name={t("app.name")} />
          <div className={s.mobileSpacer} />
          <IconButton icon="search" label={t("shell.search")} onPress={() => vm.commands.setOpen(true)} />
        </div>
        <main data-phase={vm.phase} className={s.content}>
          {children}
        </main>
        <PageLoader visible={vm.pageLoading} label={t("shell.loading")} />
      </div>
      <CommandPalette
        open={vm.commands.open}
        onOpenChange={vm.commands.setOpen}
        title={t("palette.title")}
        placeholder={t("palette.placeholder")}
        emptyLabel={t("palette.empty")}
        navigateLabel={t("palette.navigate")}
        selectLabel={t("palette.select")}
        groups={vm.commands.groups}
      />
    </div>
  );
}
