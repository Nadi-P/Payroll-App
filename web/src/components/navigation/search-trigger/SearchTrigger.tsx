"use client";

import { Icon } from "@/components/typography/icon/Icon";
import { Kbd } from "@/components/typography/kbd/Kbd";
import { searchTriggerStyles as s } from "./searchTrigger.styles";

interface SearchTriggerProps {
  label: string;
  shortcut: string;
  onPress: () => void;
}

/** Looks like a search field; opens the command palette, which does the searching. */
export function SearchTrigger({ label, shortcut, onPress }: SearchTriggerProps) {
  return (
    <button type="button" onClick={onPress} className={s.root}>
      <Icon name="search" size="sm" />
      <span className={s.label}>{label}</span>
      <Kbd keys={shortcut} />
    </button>
  );
}
