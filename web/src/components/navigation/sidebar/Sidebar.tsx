"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/feedback/badge/Badge";
import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { Link } from "@/i18n/navigation";
import { sidebarStyles as s } from "./sidebar.styles";

export interface SidebarSection {
  id: string;
  title?: string;
  items: {
    id: string;
    href: string;
    label: string;
    icon: IconName;
    active?: boolean;
    count?: number;
    countTone?: "danger" | "warning" | "neutral";
    soonLabel?: string;
  }[];
}

interface SidebarProps {
  brand: ReactNode;
  /** Under the brand: the company picker and search. */
  header?: ReactNode;
  sections: SidebarSection[];
  footer?: ReactNode;
  /** Small screens only: whether the drawer is showing. */
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
}

export function Sidebar({ brand, header, sections, footer, open, onClose, ariaLabel }: SidebarProps) {
  return (
    <>
      <div aria-hidden onClick={onClose} className={s.scrim({ open })} />
      <aside aria-label={ariaLabel} className={s.root({ open })}>
        <div className={s.brand}>{brand}</div>
        {header ? <div className={s.header}>{header}</div> : null}
        <nav className={s.nav}>
          {sections.map((section) => (
            <div key={section.id} className={s.section}>
              {section.title ? <div className={s.sectionTitle}>{section.title}</div> : null}
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  aria-current={item.active ? "page" : undefined}
                  className={s.item({ active: !!item.active, soon: !!item.soonLabel })}
                >
                  <Icon name={item.icon} />
                  <span className={s.itemLabel}>{item.label}</span>
                  {item.count ? <Badge label={item.count} tone={item.countTone ?? "neutral"} /> : null}
                  {item.soonLabel ? <Badge label={item.soonLabel} tone="outline" /> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        {footer ? <div className={s.footer}>{footer}</div> : null}
      </aside>
    </>
  );
}
