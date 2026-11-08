import type { ReactNode } from "react";
import { Icon } from "@/components/typography/icon/Icon";
import { Text } from "@/components/typography/text/Text";
import { calloutParts, calloutStyles } from "./callout.styles";

const ICON = { info: "info", warning: "alert-triangle", danger: "alert-circle", success: "check-circle", neutral: "info" } as const;

interface CalloutProps {
  tone?: "info" | "warning" | "danger" | "success" | "neutral";
  title: string;
  body?: ReactNode;
  actions?: ReactNode;
}

export function Callout({ tone = "info", title, body, actions }: CalloutProps) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={calloutStyles({ tone })}>
      <span className={calloutParts.icon}>
        <Icon name={ICON[tone]} tone={tone === "neutral" ? "muted" : tone} />
      </span>
      <div className={calloutParts.body}>
        <Text weight="medium">{title}</Text>
        {body ? <Text size="sm" tone="muted">{body}</Text> : null}
      </div>
      {actions ? <div className={calloutParts.actions}>{actions}</div> : null}
    </div>
  );
}
