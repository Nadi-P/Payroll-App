"use client";

import { cn } from "@/lib/cn";
import { numberInputStyles } from "./numberInput.styles";
import { useNumberInput } from "./useNumberInput";

interface NumberInputProps {
  value: string | null | undefined;
  /** Called with a normalized decimal string (or null when cleared) on blur or Enter. */
  onCommit: (value: string | null) => void;
  onCancel?: () => void;
  /** Text to start editing with (e.g. the key typed into a grid cell). */
  initialText?: string;
  suffix?: string;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  align?: "start" | "end";
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
}

export function NumberInput(props: NumberInputProps) {
  const input = useNumberInput(props);
  const s = numberInputStyles;
  return (
    <span className={s.wrap}>
      <input
        ref={input.ref}
        dir="ltr"
        inputMode="decimal"
        value={input.text}
        onChange={(e) => input.onChange(e.target.value)}
        onFocus={input.onFocus}
        onBlur={input.onBlur}
        onKeyDown={input.onKeyDown}
        placeholder={props.placeholder}
        disabled={props.disabled}
        aria-label={props.ariaLabel}
        aria-invalid={props.invalid || undefined}
        className={cn(
          s.input({ size: props.size, invalid: props.invalid }),
          s.align({ align: props.align, suffix: !!props.suffix }),
        )}
      />
      {props.suffix ? <span className={s.suffix}>{props.suffix}</span> : null}
    </span>
  );
}
