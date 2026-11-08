"use client";

import type { ReactNode } from "react";
import { DropdownMenu } from "@/components/overlays/dropdown-menu/DropdownMenu";
import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { contextSwitcherStyles as s } from "./contextSwitcher.styles";

interface ContextSwitcherProps {
  icon: IconName;
  caption: string;
  value: string;
  options: { id: string; label: string; hint?: string; trailing?: ReactNode; selected?: boolean }[];
  onSelect: (id: string) => void;
}

/** A sidebar picker for the current company. */
export function ContextSwitcher({ icon, caption, value, options, onSelect }: ContextSwitcherProps) {
  return (
    <DropdownMenu
      label={caption}
      items={options.map((o) => ({
        id: o.id,
        label: o.label,
        hint: o.hint,
        trailing: o.trailing,
        checked: o.selected,
        onSelect: () => onSelect(o.id),
      }))}
      trigger={
        <button type="button" className={s.trigger}>
          <span className={s.iconBox}>
            <Icon name={icon} size="sm" />
          </span>
          <span className={s.text}>
            <span className={s.caption}>{caption}</span>
            <span className={s.value}>{value}</span>
          </span>
          <span className={s.chevron}>
            <Icon name="chevrons-up-down" size="sm" />
          </span>
        </button>
      }
    />
  );
}
