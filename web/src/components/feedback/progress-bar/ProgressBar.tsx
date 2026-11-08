import { progressBarStyles as s, type ProgressBarVariants } from "./progressBar.styles";

interface ProgressBarProps extends ProgressBarVariants {
  /** 0 to 1. */
  value: number;
  label: string;
}

export function ProgressBar({ value, label, tone }: ProgressBarProps) {
  const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className={s.track}>
      <div className={s.fill({ tone })} style={{ inlineSize: `${pct}%` }} />
    </div>
  );
}
