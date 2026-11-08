"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { actionCardStyles as s } from "./actionCard.styles";

interface ActionCardProps {
  icon: IconName;
  title: string;
  description: string;
  /** Under a divider at the bottom, e.g. a tag. */
  footer?: ReactNode;
  onPress: () => void;
}

/** A large clickable card that opens something: a report in a gallery, for example. */
export function ActionCard({ icon, title, description, footer, onPress }: ActionCardProps) {
  return (
    <button type="button" className={s.root} onClick={onPress}>
      <span className={s.icon}>
        <Icon name={icon} />
      </span>
      <span className={s.text}>
        <span className={s.title}>{title}</span>
        <span className={s.description}>{description}</span>
      </span>
      <span className={s.foot}>
        {footer}
        <Icon name="chevron-forward" size="sm" tone="subtle" />
      </span>
    </button>
  );
}
