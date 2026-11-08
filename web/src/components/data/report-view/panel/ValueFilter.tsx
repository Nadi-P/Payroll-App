"use client";

import { useState } from "react";
import { Button } from "@/components/actions/button/Button";
import { Checkbox } from "@/components/inputs/checkbox/Checkbox";
import { SearchInput } from "@/components/inputs/search-input/SearchInput";
import type { PanelLabels } from "./panel.types";
import { reportPanelStyles as s } from "./reportPanel.styles";

interface ValueFilterProps {
  /** Every value of the column, as text. */
  values: string[];
  /** The values kept; undefined = no filter (all kept). */
  allowed: string[] | undefined;
  onChange: (allowed: string[] | undefined) => void;
  format: (value: string) => string;
  labels: PanelLabels;
}

/** Keep only rows whose value in this column is ticked. */
export function ValueFilter({ values, allowed, onChange, format, labels }: ValueFilterProps) {
  const [query, setQuery] = useState("");
  const kept = new Set(allowed ?? values);
  const q = query.trim().toLowerCase();
  const shown = values.filter((v) => !q || format(v).toLowerCase().includes(q));
  const set = (next: Set<string>) => onChange(next.size === values.length ? undefined : values.filter((v) => next.has(v)));
  const L = labels.filter;
  return (
    <div className={s.section}>
      <div className={s.sectionTitle}>{L.title}</div>
      <SearchInput size="sm" value={query} onChange={setQuery} placeholder={labels.search} />
      <div className={s.inline}>
        <Button variant="ghost" size="sm" label={L.all} onPress={() => set(new Set([...kept, ...shown]))} />
        <Button variant="ghost" size="sm" label={L.none} onPress={() => set(new Set([...kept].filter((v) => !shown.includes(v))))} />
        {allowed ? <Button variant="ghost" size="sm" icon="x" label={L.clear} onPress={() => onChange(undefined)} /> : null}
      </div>
      <div className={s.values}>
        {shown.length ? (
          shown.map((v) => (
            <div key={v} className={s.valueRow}>
              <Checkbox
                checked={kept.has(v)}
                onChange={(on) => {
                  const next = new Set(kept);
                  if (on) next.add(v);
                  else next.delete(v);
                  set(next);
                }}
                label={format(v) || L.empty}
              />
            </div>
          ))
        ) : (
          <div className={s.empty}>{L.empty}</div>
        )}
      </div>
    </div>
  );
}
