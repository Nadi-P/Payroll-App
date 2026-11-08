"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { switchStyles } from "./switch.styles";
import { useSwitch } from "./useSwitch";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  const { id } = useSwitch();
  return (
    <div className={switchStyles.root}>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={switchStyles.track}
      >
        <RadixSwitch.Thumb className={switchStyles.thumb} />
      </RadixSwitch.Root>
      {label ? (
        <label htmlFor={id} className={switchStyles.label}>
          {label}
        </label>
      ) : null}
    </div>
  );
}
