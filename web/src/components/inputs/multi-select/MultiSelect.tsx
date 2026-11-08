"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { multiSelectStyles as s } from "./multiSelect.styles";

export interface MultiSelectOption {
  id: string;
  label: string;
  checked: boolean;
  /** A color swatch, e.g. the chart color of this series. */
  swatch?: string;
}

interface MultiSelectProps {
  icon?: IconName;
  label: string;
  /** Short state shown on the trigger, e.g. "4/6". */
  summary: string;
  options: MultiSelectOption[];
  onToggle: (id: string) => void;
  onAll: () => void;
  onNone: () => void;
  allLabel: string;
  noneLabel: string;
}

/** A compact filter: a trigger with a count, opening a checklist that stays open while toggling. */
export function MultiSelect({ icon = "filter", label, summary, options, onToggle, onAll, onNone, allLabel, noneLabel }: MultiSelectProps) {
  return (
    // Not modal: a filter should not lock the page's scrollbar behind it.
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>
        <button type="button" className={s.trigger}>
          <Icon name={icon} size="sm" />
          <span className={s.triggerLabel}>{label}</span>
          <span className={s.summary}>{summary}</span>
          <Icon name="chevron-down" size="xs" />
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={6} className={s.content}>
          <div className={s.quick}>
            <Menu.Item onSelect={(e) => { e.preventDefault(); onAll(); }} className={s.quickItem}>
              {allLabel}
            </Menu.Item>
            <Menu.Item onSelect={(e) => { e.preventDefault(); onNone(); }} className={s.quickItem}>
              {noneLabel}
            </Menu.Item>
          </div>
          <div className={s.list}>
            {options.map((o) => (
              <Menu.CheckboxItem
                key={o.id}
                checked={o.checked}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => onToggle(o.id)}
                className={s.item}
              >
                <span className={s.box({ checked: o.checked })}>
                  <Menu.ItemIndicator>
                    <Icon name="check" size="xs" />
                  </Menu.ItemIndicator>
                </span>
                {o.swatch ? <span className={s.swatch} style={{ background: o.swatch }} /> : null}
                <span className={s.itemLabel}>{o.label}</span>
              </Menu.CheckboxItem>
            ))}
          </div>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
