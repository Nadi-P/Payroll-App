import type { ReactNode } from "react";
import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { Text } from "@/components/typography/text/Text";
import { statStyles as s } from "./stat.styles";

interface StatProps {
  label: string;
  value: ReactNode;
  icon?: IconName;
  hint?: string;
  hintTone?: "default" | "positive" | "negative" | "warning";
}

export function Stat({ label, value, icon, hint, hintTone }: StatProps) {
  return (
    <div className={s.root}>
      <span className={s.labelRow}>
        {icon ? <Icon name={icon} size="sm" /> : null}
        <Text size="sm" tone="muted">{label}</Text>
      </span>
      <span className={s.value}>{value}</span>
      {hint ? <span className={s.hint({ tone: hintTone })}>{hint}</span> : null}
    </div>
  );
}
