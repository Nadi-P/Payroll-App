"use client";

import { Button } from "@/components/actions/button/Button";
import { DataGrid } from "@/components/data/data-grid/DataGrid";
import { Badge } from "@/components/feedback/badge/Badge";
import { Callout } from "@/components/feedback/callout/Callout";
import { Checkbox } from "@/components/inputs/checkbox/Checkbox";
import { Field } from "@/components/inputs/field/Field";
import { SearchInput } from "@/components/inputs/search-input/SearchInput";
import { SegmentedControl } from "@/components/inputs/segmented-control/SegmentedControl";
import { Select } from "@/components/inputs/select/Select";
import { Switch } from "@/components/inputs/switch/Switch";
import { TextInput } from "@/components/inputs/text-input/TextInput";
import { Dialog } from "@/components/overlays/dialog/Dialog";
import { Card } from "@/components/surfaces/card/Card";
import { PageHeader } from "@/components/surfaces/page-header/PageHeader";
import { MonoText } from "@/components/typography/mono-text/MonoText";
import { Text } from "@/components/typography/text/Text";
import type { Component, Proration } from "@/api/types.generated";
import { FLAGS, useSettings } from "./logic/useSettings";
import { settingsStyles as s } from "./settings.styles";

export function SettingsScreen() {
  const vm = useSettings();
  const { t, draft } = vm;
  const policies = draft?.settings;

  return (
    <>
      <PageHeader
        title={t("settings.title")}
        actions={
          vm.dirty ? (
            <>
              <Button variant="ghost" label={t("profile.discard")} onPress={vm.discard} />
              <Button variant="primary" icon="check" label={t("common.save")} loading={vm.saving} onPress={vm.save} />
            </>
          ) : null
        }
      />
      {vm.error ? <Callout tone="danger" title={t("errors.actionFailed")} body={vm.error} /> : null}

      <div className={s.top}>
        <Card title={t("settings.company.title")}>
          <div className={s.form}>
            <div className={s.full}>
              <Field label={t("settings.company.name")}><TextInput value={draft?.name ?? ""} onChange={vm.setName} /></Field>
            </div>
            <Field label={t("settings.company.file")}><TextInput ltr value={draft?.deductions_file ?? ""} onChange={vm.setFile} /></Field>
          </div>
        </Card>
        <Card title={t("settings.policies.title")}>
          <div className={s.form}>
            <div className={s.full}>
              <Field label={t("settings.policies.taxMethod")}>
                <SegmentedControl
                  fullWidth
                  value={policies?.tax_method ?? "monthly"}
                  onChange={vm.setPolicy("tax_method")}
                  options={[
                    { value: "monthly", label: t("settings.policies.monthly") },
                    { value: "cumulative", label: t("settings.policies.cumulative") },
                  ]}
                />
              </Field>
            </div>
            <Field label={t("settings.policies.proration")}>
              <Select
                value={policies?.proration ?? "work_days"}
                onChange={(v) => vm.setPolicy("proration")(v as Proration)}
                options={[
                  { value: "work_days", label: t("settings.policies.workDays") },
                  { value: "calendar_days", label: t("settings.policies.calendarDays") },
                ]}
              />
            </Field>
            <Field label={t("settings.policies.recuperation")}>
              <Select
                value={policies?.recuperation_month ? String(policies.recuperation_month) : "spread"}
                onChange={(v) => vm.setPolicy("recuperation_month")(v === "spread" ? null : Number(v))}
                options={[
                  { value: "spread", label: t("settings.policies.spread") },
                  ...vm.months.map((m) => ({ value: String(m), label: t("settings.policies.inMonth", { month: m }) })),
                ]}
              />
            </Field>
          </div>
        </Card>
      </div>

      <Card
        title={t("settings.catalog.title")}
        subtitle={t("settings.catalog.subtitle", { count: vm.count })}
        actions={
          <div className={s.catalogActions}>
            <div className={s.search}>
              <SearchInput size="sm" value={vm.query} onChange={vm.setQuery} placeholder={t("settings.catalog.search")} />
            </div>
            <Button variant="primary" icon="plus" label={t("settings.catalog.add")} onPress={vm.startNew} />
          </div>
        }
        padded={false}
      >
        <DataGrid<Component>
          readOnly
          framed={false}
          ariaLabel={t("settings.catalog.title")}
          rows={vm.components}
          rowKey={(c) => c.code}
          onSelect={vm.startEdit}
          maxHeight="32rem"
          columns={[
            { id: "name", header: t("settings.catalog.name"), sticky: true, sortValue: vm.nameOf, cell: (c) => <Text weight="medium" tone={c.active ? "default" : "subtle"}>{vm.nameOf(c)}</Text> },
            { id: "code", header: t("settings.catalog.code"), cell: (c) => <MonoText value={c.code} /> },
            { id: "kind", header: t("settings.catalog.kind"), cell: (c) => <Badge tone={c.kind === "deduction" ? "warning" : c.kind === "benefit" ? "info" : "accent"} label={t(`settings.kinds.${c.kind}`)} /> },
            {
              id: "flags",
              header: t("settings.catalog.flags"),
              cell: (c) => (
                <div className={s.flags}>
                  {c.active ? null : <Badge tone="neutral" label={t("settings.catalog.inactive")} />}
                  {vm.flagsOf(c).map((f) => <Badge key={f} tone="outline" label={t(`settings.flags.${f}`)} />)}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Dialog
        size="sm"
        open={!!vm.editing}
        onOpenChange={(o) => !o && vm.closeEditor()}
        title={vm.isNew ? t("settings.catalog.add") : vm.editingName}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button variant="ghost" label={t("common.cancel")} onPress={vm.closeEditor} />
            <Button variant="primary" icon="check" label={t("common.save")} disabled={!vm.canSaveComponent} loading={vm.savingComponent} onPress={vm.saveComponent} />
          </>
        }
      >
        {vm.editing ? (
          <div className={s.editor}>
            <Field label={t("settings.catalog.name")}><TextInput value={vm.editingName} onChange={vm.setEditingName} /></Field>
            <Field label={t("settings.catalog.kind")}>
              <SegmentedControl
                fullWidth
                value={vm.editing.kind}
                onChange={vm.setEditingKind}
                options={[
                  { value: "earning", label: t("settings.kinds.earning") },
                  { value: "benefit", label: t("settings.kinds.benefit") },
                  { value: "deduction", label: t("settings.kinds.deduction") },
                ]}
              />
            </Field>
            {vm.editing.kind === "deduction" ? null : (
              <Field label={t("settings.catalog.flags")}>
                <div className={s.editorFlags}>
                  {FLAGS.map((f) => (
                    <Checkbox key={f} checked={!!vm.editing?.[f]} onChange={(on) => vm.setEditingFlag(f, on)} label={t(`settings.flags.${f}`)} />
                  ))}
                </div>
              </Field>
            )}
            {vm.isNew ? null : <Switch checked={vm.editing.active ?? true} onChange={vm.setEditingActive} label={t("settings.catalog.active")} />}
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
