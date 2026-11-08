import { Tooltip } from "@/components/overlays/tooltip/Tooltip";
import { Icon } from "@/components/typography/icon/Icon";
import { Link } from "@/i18n/navigation";
import { countChipStyles as s } from "./countChip.styles";

interface CountChipProps {
  severity: "error" | "warning" | "info";
  count: number;
  /** Spelled-out meaning, e.g. "2 errors": tooltip and accessible name. */
  label: string;
  href?: string;
  /** Show the spelled-out label instead of the bare number. */
  verbose?: boolean;
}

const ICON = { error: "alert-circle", warning: "alert-triangle", info: "info" } as const;

/** A colored severity count (errors, warnings, flags) that links to where they are. */
export function CountChip({ severity, count, label, href, verbose }: CountChipProps) {
  const body = (
    <>
      <Icon name={ICON[severity]} size="sm" />
      <span className={s.count}>{verbose ? label : count}</span>
    </>
  );
  if (verbose && !href) return <span className={s.root({ severity, interactive: false })}>{body}</span>;
  return (
    <Tooltip content={label}>
      {href ? (
        <Link href={href} aria-label={label} className={s.root({ severity, interactive: true })}>
          {body}
        </Link>
      ) : (
        <span aria-label={label} className={s.root({ severity, interactive: false })}>
          {body}
        </span>
      )}
    </Tooltip>
  );
}
