"use client";

import { Avatar } from "@/components/data/avatar/Avatar";
import { DropdownMenu } from "@/components/overlays/dropdown-menu/DropdownMenu";
import { Icon } from "@/components/typography/icon/Icon";
import { userSwitcherStyles as s } from "./userSwitcher.styles";

interface UserSwitcherProps {
  label: string;
  name: string;
  role: string;
  users: { id: string; name: string; role: string; selected: boolean }[];
  onSelect: (id: string) => void;
}

/** The signed-in user, with a menu to act as another (until real sign-in exists). */
export function UserSwitcher({ label, name, role, users, onSelect }: UserSwitcherProps) {
  return (
    <DropdownMenu
      align="start"
      label={label}
      items={users.map((u) => ({
        id: u.id,
        label: u.name,
        hint: u.role,
        checked: u.selected,
        leading: <Avatar name={u.name} size="sm" />,
        onSelect: () => onSelect(u.id),
      }))}
      trigger={
        <button type="button" aria-label={label} className={s.trigger}>
          <Avatar name={name} size="sm" />
          <span className={s.text}>
            <span className={s.name}>{name}</span>
            <span className={s.role}>{role}</span>
          </span>
          <Icon name="chevrons-up-down" size="sm" tone="subtle" />
        </button>
      }
    />
  );
}
