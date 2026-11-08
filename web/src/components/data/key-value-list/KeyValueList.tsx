import type { ReactNode } from "react";
import { Icon } from "@/components/typography/icon/Icon";
import { Text } from "@/components/typography/text/Text";
import { keyValueStyles as s } from "./keyValueList.styles";

export interface KeyValueItem {
  key: string;
  label: string;
  value: ReactNode;
  hint?: string;
  total?: boolean;
  onExplain?: () => void;
}

interface KeyValueListProps {
  items: KeyValueItem[];
  explainLabel?: string;
}

export function KeyValueList({ items, explainLabel }: KeyValueListProps) {
  return (
    <div className={s.list}>
      {items.map((item) => {
        const Tag = item.onExplain ? "button" : "div";
        return (
          <Tag
            key={item.key}
            type={item.onExplain ? "button" : undefined}
            onClick={item.onExplain}
            title={item.onExplain ? explainLabel : undefined}
            className={s.row({ explainable: !!item.onExplain, emphasis: item.total ? "total" : "none" })}
          >
            <span className={s.label}>
              <Text tone={item.total ? "default" : "muted"} weight={item.total ? "semibold" : "regular"} truncate>
                {item.label}
              </Text>
              {item.hint ? <Text size="xs" tone="subtle">{item.hint}</Text> : null}
              {item.onExplain ? (
                <span className={s.explainIcon}>
                  <Icon name="help" size="xs" />
                </span>
              ) : null}
            </span>
            <span className={s.value}>{item.value}</span>
          </Tag>
        );
      })}
    </div>
  );
}
