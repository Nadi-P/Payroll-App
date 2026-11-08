"use client";

import { useState } from "react";
import { Button } from "@/components/actions/button/Button";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { Field } from "@/components/inputs/field/Field";
import { TextInput } from "@/components/inputs/text-input/TextInput";
import { Dialog } from "@/components/overlays/dialog/Dialog";
import { deviationFields, isNumeric, syncDeviationValues } from "../reportMath";
import type { ReportConfig, ReportField, ReportRow } from "../reportView.types";
import { ColumnsScreen } from "./ColumnsScreen";
import { DeviationsEditor } from "./DeviationsEditor";
import { FieldScreen } from "./FieldScreen";
import { LayoutScreen } from "./LayoutScreen";
import type { PanelLabels, PanelScreen, PresetsState } from "./panel.types";
import { PresetsScreen } from "./PresetsScreen";
import { reportPanelStyles as s } from "./reportPanel.styles";

interface ReportSidePanelProps {
  open: boolean;
  onClose: () => void;
  mode: "table" | "pivot";
  fields: ReportField[];
  rows: ReportRow[];
  config: ReportConfig;
  onConfigChange: (config: ReportConfig) => void;
  presets: PresetsState;
  labels: PanelLabels;
  format: (field: ReportField, value: unknown) => string;
  /** A column to open on: set when the table asks for a column's settings. */
  focusField: string | null;
  onFocusField: (id: string | null) => void;
}

/** The side panel of a report (Verisal's): columns or pivot layout, a column's settings, saved layouts. */
export function ReportSidePanel({
  open,
  onClose,
  mode,
  fields,
  rows,
  config,
  onConfigChange,
  presets,
  labels,
  format,
  focusField,
  onFocusField,
}: ReportSidePanelProps) {
  const [screen, setScreen] = useState<PanelScreen>("main");
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState("");
  const all = mode === "table" ? [...fields, ...deviationFields(config.deviations, labels.deviations)] : fields;
  const field = focusField ? all.find((f) => f.id === focusField) : undefined;
  const current = field ? "field" : screen;

  const back = () => {
    onFocusField(null);
    setScreen("main");
  };
  const title =
    current === "field" && field ? field.label : current === "presets" ? labels.presets : (presets.appliedName ?? labels.title);
  const P = labels.presetsScreen;

  return (
    <aside className={s.root({ open })} aria-label={labels.title}>
      <div className={s.top}>
        {current !== "main" ? <IconButton size="sm" icon="chevron-back" label={labels.back} onPress={back} /> : null}
        <div className={s.title}>{title}</div>
        <IconButton size="sm" icon="reset" label={labels.reset} disabled={!presets.modified} onPress={presets.onReset} />
        <IconButton
          size="sm"
          icon="save"
          label={labels.save}
          onPress={() => {
            setName(presets.appliedName ?? "");
            setSaving(true);
          }}
        />
        <IconButton
          size="sm"
          icon="bookmark"
          label={labels.presets}
          onPress={() => {
            onFocusField(null);
            setScreen("presets");
          }}
        />
        <IconButton size="sm" icon="x" label={labels.close} onPress={onClose} />
      </div>
      <div className={s.body}>
        {current === "field" && field ? (
          <FieldScreen field={field} mode={mode} rows={rows} config={config} onConfigChange={onConfigChange} labels={labels} format={format} />
        ) : current === "presets" ? (
          <PresetsScreen
            presets={presets}
            labels={labels}
            onRename={(n) => {
              setName(n);
              setRenaming(n);
            }}
          />
        ) : mode === "table" ? (
          <>
            <ColumnsScreen fields={all} config={config} onConfigChange={onConfigChange} labels={labels} onOpenField={onFocusField} />
            <DeviationsEditor
              deviations={config.deviations}
              onChange={(deviations) => onConfigChange({ ...config, deviations, values: syncDeviationValues(config.values, deviations) })}
              onAdd={() =>
                onConfigChange({
                  ...config,
                  deviations: [...config.deviations, { id: `d${Date.now()}`, name: "", sourceA: null, sourceB: null, showDiff: true, showPercent: false }],
                })
              }
              sources={fields.filter(isNumeric).map((f) => ({ value: f.id, label: f.label }))}
              labels={labels}
            />
          </>
        ) : (
          <LayoutScreen fields={fields} config={config} onConfigChange={onConfigChange} labels={labels} onOpenField={onFocusField} />
        )}
      </div>

      <Dialog
        size="sm"
        open={saving}
        onOpenChange={(o) => !o && setSaving(false)}
        title={P.saveTitle}
        closeLabel={labels.close}
        footer={
          <>
            <Button variant="ghost" label={P.cancel} onPress={() => setSaving(false)} />
            {presets.appliedName && name.trim() === presets.appliedName ? (
              <Button
                variant="primary"
                icon="save"
                label={P.override}
                onPress={() => {
                  presets.onOverride();
                  setSaving(false);
                }}
              />
            ) : (
              <Button
                variant="primary"
                icon="save"
                label={P.saveNew}
                disabled={!name.trim()}
                onPress={() => {
                  presets.onSaveNew(name.trim());
                  setSaving(false);
                }}
              />
            )}
          </>
        }
      >
        <div className={s.dialogBody}>
          <Field label={P.name}>
            <TextInput autoFocus value={name} onChange={setName} />
          </Field>
        </div>
      </Dialog>

      <Dialog
        size="sm"
        open={renaming !== null}
        onOpenChange={(o) => !o && setRenaming(null)}
        title={P.renameTitle}
        closeLabel={labels.close}
        footer={
          <>
            <Button variant="ghost" label={P.cancel} onPress={() => setRenaming(null)} />
            <Button
              variant="primary"
              icon="check"
              label={P.rename}
              disabled={!name.trim()}
              onPress={() => {
                if (renaming) presets.onRename(renaming, name.trim());
                setRenaming(null);
              }}
            />
          </>
        }
      >
        <div className={s.dialogBody}>
          <Field label={P.name}>
            <TextInput autoFocus value={name} onChange={setName} />
          </Field>
        </div>
      </Dialog>
    </aside>
  );
}
