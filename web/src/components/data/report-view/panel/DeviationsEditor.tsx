"use client";

import { Button } from "@/components/actions/button/Button";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { Checkbox } from "@/components/inputs/checkbox/Checkbox";
import { Select } from "@/components/inputs/select/Select";
import { TextInput } from "@/components/inputs/text-input/TextInput";
import type { Deviation } from "../reportView.types";
import type { PanelLabels } from "./panel.types";
import { reportPanelStyles as s } from "./reportPanel.styles";

interface DeviationsEditorProps {
  deviations: Deviation[];
  onChange: (deviations: Deviation[]) => void;
  /** The values that can be compared: the numeric fields placed in Values. */
  sources: { value: string; label: string }[];
  labels: PanelLabels;
  onAdd: () => void;
}

/** Comparison columns: the difference between two values, in shekels and/or percent. */
export function DeviationsEditor({ deviations, onChange, sources, labels, onAdd }: DeviationsEditorProps) {
  const L = labels.deviations;
  const set = (id: string, patch: Partial<Deviation>) => onChange(deviations.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  return (
    <div className={s.section}>
      <div className={s.sectionTitle}>{L.title}</div>
      {deviations.map((d) => (
        <div key={d.id} className={s.deviation}>
          <div className={s.deviationHead}>
            <TextInput size="sm" ariaLabel={L.name} placeholder={L.name} value={d.name} onChange={(v) => set(d.id, { name: v })} />
            <IconButton size="sm" icon="trash" label={L.remove} onPress={() => onChange(deviations.filter((x) => x.id !== d.id))} />
          </div>
          <div className={s.grid2}>
            <Select size="sm" ariaLabel={L.first} placeholder={L.first} value={d.sourceA ?? undefined} onChange={(v) => set(d.id, { sourceA: v })} options={sources} />
            <Select size="sm" ariaLabel={L.second} placeholder={L.second} value={d.sourceB ?? undefined} onChange={(v) => set(d.id, { sourceB: v })} options={sources} />
          </div>
          <div className={s.inline}>
            <Checkbox checked={d.showDiff} onChange={(v) => set(d.id, { showDiff: v })} label={L.diff} />
            <Checkbox checked={d.showPercent} onChange={(v) => set(d.id, { showPercent: v })} label={L.percent} />
          </div>
        </div>
      ))}
      <div>
        <Button variant="ghost" size="sm" icon="plus" label={L.add} disabled={sources.length < 2} onPress={onAdd} />
      </div>
    </div>
  );
}
