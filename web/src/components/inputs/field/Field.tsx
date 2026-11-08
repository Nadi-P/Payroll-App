import type { ReactNode } from "react";
import { Icon } from "@/components/typography/icon/Icon";
import { fieldStyles } from "./field.styles";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  aside?: ReactNode;
  children: ReactNode;
}

/** A labelled form control with optional hint and error message. */
export function Field({ label, hint, error, aside, children }: FieldProps) {
  return (
    <div className={fieldStyles.root}>
      <div className={fieldStyles.labelRow}>
        <span className={fieldStyles.label}>{label}</span>
        {aside}
      </div>
      {children}
      {error ? (
        <span role="alert" className={fieldStyles.error}>
          <Icon name="alert-circle" size="xs" />
          {error}
        </span>
      ) : hint ? (
        <span className={fieldStyles.hint}>{hint}</span>
      ) : null}
    </div>
  );
}
