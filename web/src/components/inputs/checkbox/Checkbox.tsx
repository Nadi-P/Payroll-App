"use client";

import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Icon } from "@/components/typography/icon/Icon";
import { checkboxStyles } from "./checkbox.styles";
import { useCheckbox } from "./useCheckbox";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, label, disabled }: CheckboxProps) {
  const { id } = useCheckbox();
  return (
    <div className={checkboxStyles.root}>
      <RadixCheckbox.Root
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
        className={checkboxStyles.box}
      >
        <RadixCheckbox.Indicator>
          <Icon name="check" size="xs" />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label ? (
        <label htmlFor={id} className={checkboxStyles.label}>
          {label}
        </label>
      ) : null}
    </div>
  );
}
