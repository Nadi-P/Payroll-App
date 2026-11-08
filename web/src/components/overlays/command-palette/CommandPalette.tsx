"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { Kbd } from "@/components/typography/kbd/Kbd";
import { commandPaletteStyles as s } from "./commandPalette.styles";

export interface CommandGroup {
  id: string;
  heading: string;
  items: { id: string; label: string; hint?: string; icon?: IconName; keywords?: string[]; onSelect: () => void }[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder: string;
  emptyLabel: string;
  navigateLabel: string;
  selectLabel: string;
  groups: CommandGroup[];
}

export function CommandPalette(props: CommandPaletteProps) {
  const { open, onOpenChange, title, placeholder, emptyLabel, navigateLabel, selectLabel, groups } = props;
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={s.overlay} />
        <RadixDialog.Content className={s.content} aria-describedby={undefined}>
          <RadixDialog.Title className={s.srOnly}>{title}</RadixDialog.Title>
          <Command loop>
            <div className={s.inputRow}>
              <Icon name="search" tone="subtle" />
              <Command.Input autoFocus placeholder={placeholder} className={s.input} />
            </div>
            <Command.List className={s.list}>
              <Command.Empty className={s.empty}>{emptyLabel}</Command.Empty>
              {groups.map((group) => (
                <Command.Group key={group.id} heading={group.heading} className={s.group}>
                  {group.items.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${group.id}:${item.id}:${item.label}`}
                      keywords={item.keywords}
                      onSelect={() => {
                        onOpenChange(false);
                        item.onSelect();
                      }}
                      className={s.item}
                    >
                      {item.icon ? <Icon name={item.icon} size="sm" /> : null}
                      <span className={s.itemText}>{item.label}</span>
                      {item.hint ? <span className={s.hint}>{item.hint}</span> : null}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
            <div className={s.footer}>
              <span className={s.footerItem}>
                <Kbd keys="↑↓" />
                {navigateLabel}
              </span>
              <span className={s.footerItem}>
                <Kbd keys="↵" />
                {selectLabel}
              </span>
            </div>
          </Command>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
