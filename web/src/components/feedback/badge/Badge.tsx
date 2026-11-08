import { badgeStyles, dotStyles, type BadgeVariants } from "./badge.styles";

interface BadgeProps extends BadgeVariants {
  label: string | number;
  dot?: boolean;
  title?: string;
}

export function Badge({ label, tone, size, dot, title }: BadgeProps) {
  return (
    <span className={badgeStyles({ tone, size })} title={title}>
      {dot ? <span className={dotStyles} /> : null}
      {label}
    </span>
  );
}
