import type { Aggregation, ReportConfig, StatKind, ThresholdOperator } from "../reportView.types";

export type PanelScreen = "main" | "field" | "presets";
export type Zone = "rows" | "columns" | "values";

/** A saved layout of a report: everything in its config, under a name. */
export interface Preset {
  name: string;
  config: ReportConfig;
}

export interface PresetsState {
  presets: Preset[];
  defaultName: string | null;
  appliedName: string | null;
  /** The config differs from the applied layout (or the report's start state). */
  modified: boolean;
  onApply: (name: string) => void;
  onSaveNew: (name: string) => void;
  onOverride: () => void;
  onDelete: (name: string) => void;
  onRename: (from: string, to: string) => void;
  onSetDefault: (name: string) => void;
  onReset: () => void;
}

/** Every word of the side panel, in the user's language. */
export interface PanelLabels {
  title: string;
  close: string;
  back: string;
  reset: string;
  save: string;
  presets: string;
  columns: string;
  search: string;
  zones: Record<Zone, string>;
  dropHere: string;
  fields: string;
  remove: string;
  moveTo: Record<Zone, string>;
  settings: string;
  aggregation: string;
  aggregations: Record<Aggregation, string>;
  filter: { title: string; all: string; none: string; clear: string; empty: string };
  format: {
    title: string;
    threshold: string;
    operator: string;
    value: string;
    to: string;
    operators: Record<ThresholdOperator, string>;
    stat: string;
    stats: Record<StatKind | "none", string>;
    duplicates: string;
    clear: string;
  };
  deviations: { title: string; add: string; name: string; first: string; second: string; diff: string; percent: string; remove: string };
  table: { freeze: string; unfreeze: string; show: string; hide: string; sortAsc: string; sortDesc: string; sortNone: string; moveUp: string; moveDown: string; moveStart: string; moveEnd: string };
  presetsScreen: {
    empty: string;
    apply: string;
    makeDefault: string;
    isDefault: string;
    rename: string;
    delete: string;
    saveTitle: string;
    name: string;
    saveNew: string;
    override: string;
    renameTitle: string;
    cancel: string;
    applied: string;
  };
}
