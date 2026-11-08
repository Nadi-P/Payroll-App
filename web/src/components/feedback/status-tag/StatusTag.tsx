import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { statusTagStyles, type StatusTagVariants } from "./statusTag.styles";

interface StatusTagProps extends StatusTagVariants {
  label: string;
  icon?: IconName;
}

/** A prominent status label: a padded, softly tinted rectangle with an icon. */
export function StatusTag({ label, icon, tone }: StatusTagProps) {
  return (
    <span className={statusTagStyles({ tone })}>
      {icon ? <Icon name={icon} size="sm" /> : null}
      {label}
    </span>
  );
}
