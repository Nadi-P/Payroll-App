"use client";

import { Button } from "@/components/actions/button/Button";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { Avatar } from "@/components/data/avatar/Avatar";
import { DataGrid } from "@/components/data/data-grid/DataGrid";
import { Badge } from "@/components/feedback/badge/Badge";
import { Callout } from "@/components/feedback/callout/Callout";
import { CountChip } from "@/components/feedback/count-chip/CountChip";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { ProgressBar } from "@/components/feedback/progress-bar/ProgressBar";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { StatusTag } from "@/components/feedback/status-tag/StatusTag";
import { Field } from "@/components/inputs/field/Field";
import { SearchInput } from "@/components/inputs/search-input/SearchInput";
import { SegmentedControl } from "@/components/inputs/segmented-control/SegmentedControl";
import { TextInput } from "@/components/inputs/text-input/TextInput";
import { Dialog } from "@/components/overlays/dialog/Dialog";
import { DropdownMenu } from "@/components/overlays/dropdown-menu/DropdownMenu";
import { Tooltip } from "@/components/overlays/tooltip/Tooltip";
import { PageHeader } from "@/components/surfaces/page-header/PageHeader";
import { Text } from "@/components/typography/text/Text";
import { usePortfolioScreen, type PortfolioView } from "./logic/usePortfolioScreen";
import { portfolioStyles as s } from "./portfolio.styles";

type Row = ReturnType<typeof usePortfolioScreen>["rows"][number];

/** The clients this user works on: one quiet row each, opening the client's current month. */
export function PortfolioScreen() {
  const vm = usePortfolioScreen();
  const { t } = vm;

  const views: { value: PortfolioView; label: string }[] = [
    { value: "mine", label: t("portfolio.views.mine", { count: vm.counts.mine }) },
    { value: "free", label: t("portfolio.views.free", { count: vm.counts.free }) },
    ...(vm.canManage ? [{ value: "all" as const, label: t("portfolio.views.all", { count: vm.counts.all }) }] : []),
  ];

  return (
    <>
      <PageHeader
        title={t("portfolio.title")}
        subtitle={vm.firmName}
        actions={vm.canManage ? <Button variant="secondary" icon="plus" label={t("portfolio.add.action")} onPress={vm.add.show} /> : null}
      />
      <Dialog
        size="sm"
        open={vm.add.open}
        onOpenChange={(o) => !o && vm.add.close()}
        title={t("portfolio.add.action")}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button variant="ghost" label={t("common.cancel")} onPress={vm.add.close} />
            <Button variant="primary" icon="check" label={t("portfolio.add.save")} disabled={!vm.add.canSave} loading={vm.add.saving} onPress={vm.add.save} />
          </>
        }
      >
        <div className={s.addForm}>
          {vm.add.error ? <Callout tone="danger" title={t("errors.actionFailed")} body={vm.add.error} /> : null}
          <Field label={t("settings.company.name")}><TextInput value={vm.add.name} onChange={vm.add.setName} /></Field>
          <Field label={t("settings.company.file")}><TextInput ltr value={vm.add.file} onChange={vm.add.setFile} /></Field>
        </div>
      </Dialog>

      {vm.failed ? (
        <Callout
          tone="danger"
          title={t("errors.apiTitle")}
          body={t("errors.apiBody")}
          actions={<Button label={t("common.retry")} onPress={vm.retry} />}
        />
      ) : null}

      <div className={s.toolbar}>
        <SegmentedControl ariaLabel={t("portfolio.views.label")} value={vm.view} onChange={vm.setView} options={views} />
        <div className={s.search}>
          <SearchInput size="sm" value={vm.query} onChange={vm.setQuery} placeholder={t("portfolio.search")} />
        </div>
      </div>

      {vm.loading ? (
        <Skeleton shape="tall" />
      ) : (
        <DataGrid<Row>
          readOnly
          ariaLabel={t("portfolio.title")}
          rows={vm.rows}
          rowKey={(r) => r.id}
          onSelect={vm.open}
          empty={<EmptyState icon="building" title={t(`portfolio.empty.${vm.view}`)} />}
          columns={[
            {
              id: "name",
              header: t("portfolio.columns.client"),
              sortValue: (r) => r.name,
              cell: (r) => (
                <div className={s.client}>
                  <Text weight="semibold" truncate>{r.name}</Text>
                  <div className={s.clientMeta}>
                    <Text size="xs" tone="subtle" numeric>{r.monthLabel}</Text>
                    {r.openEarlier.length ? (
                      <Badge tone="warning" label={t("portfolio.openEarlier", { months: r.openEarlier.join(", ") })} />
                    ) : null}
                  </div>
                </div>
              ),
            },
            {
              id: "employees",
              header: t("portfolio.columns.employees"),
              align: "end",
              sortValue: (r) => r.employees,
              cell: (r) => <Text numeric>{r.employees}</Text>,
            },
            {
              id: "payslips",
              header: t("portfolio.columns.payslips"),
              width: "13rem",
              sortValue: (r) => r.share,
              cell: (r) => (
                <div className={s.progress}>
                  <ProgressBar value={r.share} tone={r.share >= 1 ? "success" : "accent"} label={t("portfolio.columns.payslips")} />
                  <Text size="xs" tone="muted" numeric>{t("portfolio.card.producedOf", { produced: r.produced, expected: r.expected })}</Text>
                </div>
              ),
            },
            {
              id: "status",
              header: t("portfolio.columns.status"),
              sortValue: (r) => r.statusLabel,
              cell: (r) => <StatusTag tone={r.status.tone} icon={r.status.icon} label={r.statusLabel} />,
            },
            {
              id: "alerts",
              header: t("portfolio.columns.alerts"),
              sortValue: (r) => r.errors * 1000 + r.warnings,
              cell: (r) =>
                r.errors || r.warnings ? (
                  <div className={s.alerts}>
                    {r.errors ? <CountChip severity="error" count={r.errors} label={t("flags.count.error", { count: r.errors })} /> : null}
                    {r.warnings ? <CountChip severity="warning" count={r.warnings} label={t("flags.count.warning", { count: r.warnings })} /> : null}
                  </div>
                ) : (
                  <Text tone="subtle">—</Text>
                ),
            },
            {
              id: "assignees",
              header: t("portfolio.columns.assignees"),
              cell: (r) => (
                // Assigning happens inside the row: the click must not open the client.
                <div className={s.assignees} onClick={(e) => e.stopPropagation()}>
                  {r.assignees.length ? (
                    r.assignees.map((a) => (
                      <Tooltip key={a.id} content={a.name}>
                        <div className={s.avatar}><Avatar name={a.name} size="sm" /></div>
                      </Tooltip>
                    ))
                  ) : (
                    <Badge tone="outline" label={t("portfolio.free")} />
                  )}
                  {vm.canManage ? (
                    <DropdownMenu
                      align="end"
                      label={t("portfolio.assign")}
                      items={r.assignItems}
                      trigger={<IconButton size="sm" icon="user" label={t("portfolio.assign")} />}
                    />
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
