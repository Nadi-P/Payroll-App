import type { ReactNode } from "react";
import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { Text } from "@/components/typography/text/Text";
import { emptyStateStyles } from "./emptyState.styles";

interface EmptyStateProps {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className={emptyStateStyles.root}>
      <span className={emptyStateStyles.icon}>
        <Icon name={icon} size="lg" />
      </span>
      <div className={emptyStateStyles.text}>
        <Text weight="semibold" size="lg">{title}</Text>
        {body ? <Text tone="muted">{body}</Text> : null}
      </div>
      {action}
    </div>
  );
}
