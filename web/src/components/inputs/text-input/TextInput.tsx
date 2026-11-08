"use client";

import { textInputStyles } from "./textInput.styles";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  disabled?: boolean;
  type?: "text" | "email" | "tel";
  /** Force left-to-right for codes, IDs and emails inside right-to-left layouts. */
  ltr?: boolean;
  ariaLabel?: string;
  /** Take the keyboard focus when shown, e.g. the only field of a dialog. */
  autoFocus?: boolean;
  /** Called when Enter is pressed: submits a one-field form. */
  onEnter?: () => void;
}

export function TextInput({ value, onChange, placeholder, size, invalid, disabled, type = "text", ltr, ariaLabel, autoFocus, onEnter }: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      dir={ltr ? "ltr" : undefined}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      autoFocus={autoFocus}
      onKeyDown={onEnter ? (e) => e.key === "Enter" && onEnter() : undefined}
      className={textInputStyles({ size, invalid })}
    />
  );
}
