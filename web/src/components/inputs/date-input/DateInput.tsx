"use client";

import { dateInputStyles } from "./dateInput.styles";

interface DateInputProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  min?: string;
  max?: string;
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export function DateInput({ value, onChange, min, max, size, invalid, disabled, ariaLabel }: DateInputProps) {
  return (
    <input
      type="date"
      dir="ltr"
      value={value ?? ""}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      className={dateInputStyles({ size, invalid })}
    />
  );
}
