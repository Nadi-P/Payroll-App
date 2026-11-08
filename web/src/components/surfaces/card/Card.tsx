import type { ReactNode } from "react";
import { Heading } from "@/components/typography/heading/Heading";
import { Text } from "@/components/typography/text/Text";
import { cardStyles as s } from "./card.styles";

interface CardProps {
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  /** "done" = a strong green frame with a soft glow, for finished work. */
  tone?: "default" | "accent" | "danger" | "warning" | "success" | "done";
  interactive?: boolean;
  /** false = the body draws edge to edge (tables, lists). */
  padded?: boolean;
  children: ReactNode;
}

export function Card({ title, subtitle, actions, footer, tone, interactive, padded = true, children }: CardProps) {
  const hasHeader = !!(title || actions);
  return (
    <section className={s.root({ tone, interactive })}>
      {hasHeader ? (
        <header className={s.header}>
          <div className={s.headerText}>
            {title ? <Heading level={2}>{title}</Heading> : null}
            {subtitle ? <Text size="sm" tone="muted">{subtitle}</Text> : null}
          </div>
          {actions ? <div className={s.actions}>{actions}</div> : null}
        </header>
      ) : null}
      <div className={s.body({ padded, headless: !hasHeader, divided: hasHeader && !padded })}>{children}</div>
      {footer ? <footer className={s.footer}>{footer}</footer> : null}
    </section>
  );
}
