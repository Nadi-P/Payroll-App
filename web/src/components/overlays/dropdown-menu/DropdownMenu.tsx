"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { Fragment, type ReactNode } from "react";
import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { dropdownMenuStyles as s } from "./dropdownMenu.styles";

export interface MenuItem {
  id: string;
  label: string;
  hint?: string;
  icon?: IconName;
  /** Custom leading visual (a flag, an avatar), in place of an icon. */
  leading?: ReactNode;
  /** Extra content at the end of the row, e.g. status chips. */
  trailing?: ReactNode;
  checked?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
  onSelect: () => void;
}

interface DropdownMenuProps {
  /** The trigger element; it must accept a ref (Button-like components do). */
  trigger: ReactNode;
  items: MenuItem[];
  label?: string;
  align?: "start" | "end";
}

export function DropdownMenu({ trigger, items, label, align = "start" }: DropdownMenuProps) {
  return (
    // Not modal: a menu should not lock the page's scrollbar behind it.
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align={align} sideOffset={6} className={s.content}>
          {label ? <Menu.Label className={s.label}>{label}</Menu.Label> : null}
          {items.map((item) => (
            <Fragment key={item.id}>
              {item.separatorBefore ? <Menu.Separator className={s.separator} /> : null}
              <Menu.Item onSelect={item.onSelect} className={s.item({ danger: item.danger })}>
                {item.leading ?? (item.icon ? <Icon name={item.icon} size="sm" tone="muted" /> : null)}
                <span className={s.itemText}>{item.label}</span>
                {item.hint ? <span className={s.hint}>{item.hint}</span> : null}
                {item.trailing ?? null}
                {item.checked ? (
                  <span className={s.check}>
                    <Icon name="check" size="sm" />
                  </span>
                ) : null}
              </Menu.Item>
            </Fragment>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
