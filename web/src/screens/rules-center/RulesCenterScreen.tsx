"use client";

import { DataGrid } from "@/components/data/data-grid/DataGrid";
import { Stat } from "@/components/data/stat/Stat";
import { Badge } from "@/components/feedback/badge/Badge";
import { Callout } from "@/components/feedback/callout/Callout";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { SearchInput } from "@/components/inputs/search-input/SearchInput";
import { SegmentedControl } from "@/components/inputs/segmented-control/SegmentedControl";
import { SidePanel } from "@/components/overlays/side-panel/SidePanel";
import { PageHeader } from "@/components/surfaces/page-header/PageHeader";
import { DateText } from "@/components/typography/date-text/DateText";
import { Heading } from "@/components/typography/heading/Heading";
import { Icon } from "@/components/typography/icon/Icon";
import { MonoText } from "@/components/typography/mono-text/MonoText";
import { Text } from "@/components/typography/text/Text";
import type { RuleEntry } from "@/api/types.generated";
import { useRulesCenter } from "./logic/useRulesCenter";
import { rulesCenterStyles as s } from "./rulesCenter.styles";

export function RulesCenterScreen() {
  const vm = useRulesCenter();
  const { t } = vm;

  return (
    <>
      <PageHeader
        eyebrow={<Badge tone="outline" label={t("shell.lawVersion", { version: vm.version })} />}
        title={t("rulesCenter.title")}
        subtitle={t("rulesCenter.subtitle")}
      />

      {!vm.coverageChecked ? null : vm.gaps.length ? (
        <Callout tone="warning" title={t("rulesCenter.gapsTitle")} body={t("rulesCenter.gapsBody", { months: vm.gapMonths.join(", ") })} />
      ) : (
        <Callout tone="success" title={t("rulesCenter.coveredTitle")} body={t("rulesCenter.coveredBody", { first: vm.coverage.first, last: vm.coverage.last })} />
      )}

      <div className={s.stats}>
        <div className={s.stat}><Stat icon="scale" label={t("rulesCenter.stats.rules")} value={<Text size="xl" weight="semibold" numeric>{vm.stats.rules}</Text>} /></div>
        <div className={s.stat}><Stat icon="history" label={t("rulesCenter.stats.versions")} value={<Text size="xl" weight="semibold" numeric>{vm.stats.versions}</Text>} /></div>
        <div className={s.stat}>
          <Stat
            icon="alert-triangle"
            label={t("rulesCenter.stats.unverified")}
            value={<Text size="xl" weight="semibold" numeric tone={vm.stats.unverified ? "warning" : "success"}>{vm.stats.unverified}</Text>}
            hint={t("rulesCenter.stats.unverifiedHint")}
          />
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.search}>
          <SearchInput value={vm.query} onChange={vm.setQuery} placeholder={t("rulesCenter.search")} />
        </div>
        <SegmentedControl
          value={vm.filter}
          onChange={vm.setFilter}
          options={[
            { value: "current", label: t("rulesCenter.filters.current") },
            { value: "unverified", label: t("rulesCenter.filters.unverified") },
            { value: "all", label: t("rulesCenter.filters.all") },
          ]}
        />
      </div>

      {vm.loading ? (
        <Skeleton shape="tall" />
      ) : (
        <DataGrid<RuleEntry>
          readOnly
          ariaLabel={t("rulesCenter.title")}
          rows={vm.rows}
          rowKey={(r) => `${r.rule_id}@${r.effective_from}`}
          onSelect={vm.show}
          empty={<EmptyState icon="search" title={t("rulesCenter.empty")} />}
          columns={[
            {
              id: "name",
              header: t("rulesCenter.columns.rule"),
              sticky: true,
              sortValue: vm.nameOf,
              cell: (r) => (
                <div className={s.nameCell}>
                  <Text weight="medium">{vm.nameOf(r)}</Text>
                  <MonoText value={r.rule_id} />
                </div>
              ),
            },
            { id: "from", header: t("rulesCenter.columns.from"), sortValue: (r) => r.effective_from, cell: (r) => <DateText value={r.effective_from} /> },
            { id: "to", header: t("rulesCenter.columns.to"), cell: (r) => (r.effective_to ? <DateText value={r.effective_to} /> : <Text tone="subtle">{t("rules.openEnded")}</Text>) },
            {
              id: "status",
              header: t("rulesCenter.columns.status"),
              cell: (r) => (
                <Badge dot tone={r.verified ? "success" : "warning"} label={r.verified ? t("rules.verified") : t("rules.unverified")} />
              ),
            },
            {
              id: "source",
              header: t("rulesCenter.columns.source"),
              cell: (r) => (
                <div className={s.sourceCell}>
                  <Text size="sm" tone="muted" truncate title={r.source}>{r.source}</Text>
                </div>
              ),
            },
          ]}
        />
      )}

      <SidePanel
        size="lg"
        open={!!vm.open}
        onOpenChange={(o) => !o && vm.close()}
        title={vm.open ? vm.nameOf(vm.open) : ""}
        subtitle={vm.open ? <MonoText value={vm.open.rule_id} /> : null}
        closeLabel={t("common.close")}
      >
        {vm.open ? (
          <div className={s.panel}>
            <div className={s.dates}>
              <Badge tone={vm.open.verified ? "success" : "warning"} label={vm.open.verified ? t("rules.verified") : t("rules.unverified")} />
              {vm.inForce(vm.open) ? <Badge tone="accent" label={t("rulesCenter.inForce")} /> : null}
            </div>
            <div className={s.panelSection}>
              <Heading level={3}>{t("rulesCenter.columns.from")}</Heading>
              <div className={s.dates}>
                <DateText value={vm.open.effective_from} />
                <Icon name="chevron-forward" size="xs" tone="subtle" />
                {vm.open.effective_to ? <DateText value={vm.open.effective_to} /> : <Text tone="subtle">{t("rules.openEnded")}</Text>}
              </div>
            </div>
            <div className={s.panelSection}>
              <Heading level={3}>{t("rulesCenter.columns.source")}</Heading>
              <Text tone="muted">{vm.open.source}</Text>
            </div>
            <div className={s.panelSection}>
              <Heading level={3}>{t("rulesCenter.value")}</Heading>
              <MonoText block value={vm.valueJson(vm.open)} />
            </div>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
