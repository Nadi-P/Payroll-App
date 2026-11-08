"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Icon } from "@/components/typography/icon/Icon";
import { selectStyles } from "./select.styles";

interface SelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string; hint?: string }[];
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Select({ value, onChange, options, placeholder, size, invalid, disabled, ariaLabel }: SelectProps) {
  const s = selectStyles;
  return (
    <RadixSelect.Root value={value} onValueChange={onChange} disabled={disabled}>
      <RadixSelect.Trigger aria-label={ariaLabel} className={s.trigger({ size, invalid })}>
        <span className={s.value}>
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        <RadixSelect.Icon className={s.chevron}>
          <Icon name="chevron-down" size="sm" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content position="popper" sideOffset={4} className={s.content}>
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item key={option.value} value={option.value} className={s.item}>
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                {option.hint ? <span className={s.itemHint}>{option.hint}</span> : null}
                <RadixSelect.ItemIndicator className={s.indicator}>
                  <Icon name="check" size="sm" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
