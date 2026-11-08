"use client";

import { IconButton } from "@/components/actions/icon-button/IconButton";
import { Badge } from "@/components/feedback/badge/Badge";
import { DropdownMenu } from "@/components/overlays/dropdown-menu/DropdownMenu";
import type { PanelLabels, PresetsState } from "./panel.types";
import { reportPanelStyles as s } from "./reportPanel.styles";

interface PresetsScreenProps {
  presets: PresetsState;
  labels: PanelLabels;
  onRename: (name: string) => void;
}

/** Saved layouts of this report: apply one, make it the default, rename or delete it. */
export function PresetsScreen({ presets, labels, onRename }: PresetsScreenProps) {
  const L = labels.presetsScreen;
  if (!presets.presets.length) return <div className={s.empty}>{L.empty}</div>;
  return (
    <div className={s.list}>
      {presets.presets.map((p) => {
        const applied = presets.appliedName === p.name;
        const isDefault = presets.defaultName === p.name;
        return (
          <div key={p.name} className={s.preset({ applied })}>
            <div className={s.presetName}>{p.name}</div>
            {isDefault ? <Badge tone="accent" label={L.isDefault} /> : null}
            {applied ? <Badge tone="outline" label={L.applied} /> : null}
            <div className={s.presetActions}>
              <IconButton size="sm" icon="check" label={L.apply} onPress={() => presets.onApply(p.name)} />
              <DropdownMenu
                align="end"
                label={p.name}
                trigger={<IconButton size="sm" icon="more" label={p.name} />}
                items={[
                  ...(isDefault ? [] : [{ id: "default", label: L.makeDefault, icon: "bookmark" as const, onSelect: () => presets.onSetDefault(p.name) }]),
                  { id: "rename", label: L.rename, icon: "pencil" as const, onSelect: () => onRename(p.name) },
                  { id: "delete", label: L.delete, icon: "trash" as const, danger: true, separatorBefore: true, onSelect: () => presets.onDelete(p.name) },
                ]}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
