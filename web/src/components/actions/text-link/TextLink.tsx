import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { Link } from "@/i18n/navigation";
import { textLinkStyles } from "./textLink.styles";

interface TextLinkProps {
  href: string;
  label: string;
  icon?: IconName;
  external?: boolean;
  tone?: "accent" | "default" | "muted";
}

export function TextLink({ href, label, icon, external, tone }: TextLinkProps) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={textLinkStyles({ tone })}>
        {label}
        <Icon name="external-link" size="xs" />
      </a>
    );
  }
  return (
    <Link href={href} className={textLinkStyles({ tone })}>
      {icon ? <Icon name={icon} size="sm" /> : null}
      {label}
    </Link>
  );
}
