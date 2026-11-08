import type { ReactNode } from "react";
import { Heading } from "@/components/typography/heading/Heading";
import { Text } from "@/components/typography/text/Text";
import { pageHeaderStyles as s } from "./pageHeader.styles";

interface PageHeaderProps {
  title: string;
  /** Context shown beside the title after a dash, e.g. the month: "Payroll — October 2026". */
  titleAside?: string;
  eyebrow?: ReactNode;
  /** A visual before the title block, e.g. an avatar. */
  leading?: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  titleAside,
  eyebrow,
  leading,
  subtitle,
  meta,
  actions,
}: PageHeaderProps) {
  return (
    <header className={s.root}>
      <div className={s.identity}>
        {leading ? <div className={s.leading}>{leading}</div> : null}
        <div className={s.text}>
          {eyebrow ? <div className={s.eyebrow}>{eyebrow}</div> : null}
          <div className={s.titleRow}>
            <Heading level={1}>{title}</Heading>
            {titleAside ? <span className={s.aside}>{titleAside}</span> : null}
          </div>
          {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
          {meta ? <div className={s.meta}>{meta}</div> : null}
        </div>
      </div>
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </header>
  );
}
