"use client";

import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { segmentedStyles } from "./segmentedControl.styles";

interface SegmentedControlProps<V extends string> {
  value: V;
  onChange: (value: V) => void;
  options: { value: V; label: string; icon?: IconName }[];
  size?: "sm" | "md";
  fullWidth?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export function SegmentedControl<V extends string>({
  value,
  onChange,
  options,
  size,
  fullWidth,
  disabled,
  ariaLabel,
}: SegmentedControlProps<V>) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={ariaLabel}
      disabled={disabled}
      onValueChange={(v) => v && onChange(v as V)}
      className={segmentedStyles.root({ fullWidth })}
    >
      {options.map((option) => (
        <ToggleGroup.Item key={option.value} value={option.value} className={segmentedStyles.item({ size })}>
          {option.icon ? <Icon name={option.icon} size="sm" /> : null}
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
