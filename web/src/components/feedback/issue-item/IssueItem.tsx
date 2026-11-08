import type { ReactNode } from "react";
import { Icon } from "@/components/typography/icon/Icon";
import { Text } from "@/components/typography/text/Text";
import { issueItemParts, issueItemStyles, severityMarker } from "./issueItem.styles";

const ICON = { error: "alert-circle", warning: "alert-triangle", info: "info" } as const;

interface IssueItemProps {
  severity: "error" | "warning" | "info";
  title: string;
  detail?: string;
  meta?: ReactNode;
  action?: ReactNode;
  onSelect?: () => void;
}

export function IssueItem({ severity, title, detail, meta, action, onSelect }: IssueItemProps) {
  const Tag = onSelect ? "button" : "div";
  return (
    <Tag
      type={onSelect ? "button" : undefined}
      onClick={onSelect}
      className={issueItemStyles({ interactive: !!onSelect })}
    >
      <span className={severityMarker({ severity })}>
        <Icon name={ICON[severity]} size="sm" />
      </span>
      <span className={issueItemParts.body}>
        <span className={issueItemParts.titleRow}>
          <Text weight="medium">{title}</Text>
          {meta}
        </span>
        {detail ? <Text size="sm" tone="muted">{detail}</Text> : null}
      </span>
      {action ? <span className={issueItemParts.action}>{action}</span> : null}
    </Tag>
  );
}
