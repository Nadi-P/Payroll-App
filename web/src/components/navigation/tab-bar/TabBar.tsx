"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { Badge } from "@/components/feedback/badge/Badge";
import { tabBarStyles as s } from "./tabBar.styles";

interface TabBarProps<V extends string> {
  value: V;
  onChange: (value: V) => void;
  tabs: { value: V; label: string; count?: number; countTone?: "danger" | "warning" | "neutral" }[];
  ariaLabel: string;
}

/** Tab headers only; the screen renders the content of the selected tab. */
export function TabBar<V extends string>({ value, onChange, tabs, ariaLabel }: TabBarProps<V>) {
  return (
    <Tabs.Root value={value} onValueChange={(v) => onChange(v as V)} activationMode="manual">
      <Tabs.List aria-label={ariaLabel} className={s.list}>
        {tabs.map((tab) => (
          <Tabs.Trigger key={tab.value} value={tab.value} className={s.tab}>
            {tab.label}
            {tab.count ? <Badge label={tab.count} tone={tab.countTone ?? "neutral"} /> : null}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
