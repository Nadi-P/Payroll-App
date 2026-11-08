"use client";

import { DropdownMenu } from "@/components/overlays/dropdown-menu/DropdownMenu";
import { Icon } from "@/components/typography/icon/Icon";
import { Flag, type FlagCode } from "@/components/typography/flag/Flag";
import { languageSwitcherStyles as s } from "./languageSwitcher.styles";

interface LanguageSwitcherProps {
  label: string;
  languages: { id: string; label: string; flag: FlagCode; checked: boolean; onSelect: () => void }[];
}

/** Top-bar language picker: the current language's flag, a menu of all four. */
export function LanguageSwitcher({ label, languages }: LanguageSwitcherProps) {
  const current = languages.find((l) => l.checked) ?? languages[0];
  return (
    <DropdownMenu
      align="end"
      label={label}
      items={languages.map((l) => ({
        id: l.id,
        label: l.label,
        checked: l.checked,
        onSelect: l.onSelect,
        leading: <Flag code={l.flag} />,
      }))}
      trigger={
        <button type="button" aria-label={label} className={s.trigger}>
          {current ? <Flag code={current.flag} /> : null}
          <span className={s.code}>{current?.id}</span>
          <Icon name="chevron-down" size="xs" tone="subtle" />
        </button>
      }
    />
  );
}
