"use client";

import { Button } from "@/components/actions/button/Button";
import { BreakdownChart } from "@/components/charts/breakdown-chart/BreakdownChart";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart/HorizontalBarChart";
import { Avatar } from "@/components/data/avatar/Avatar";
import { DataGrid } from "@/components/data/data-grid/DataGrid";
import { Stat } from "@/components/data/stat/Stat";
import { Badge } from "@/components/feedback/badge/Badge";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { MultiSelect } from "@/components/inputs/multi-select/MultiSelect";
import { SearchInput } from "@/components/inputs/search-input/SearchInput";
import { SegmentedControl } from "@/components/inputs/segmented-control/SegmentedControl";
import { Select } from "@/components/inputs/select/Select";
import { Card } from "@/components/surfaces/card/Card";
import { PageHeader } from "@/components/surfaces/page-header/PageHeader";
import { DateText } from "@/components/typography/date-text/DateText";
import { MonoText } from "@/components/typography/mono-text/MonoText";
import { Money } from "@/components/typography/money/Money";
import { Text } from "@/components/typography/text/Text";
import type { EmployeeRecord } from "@/api/types.generated";
import { AddEmployeeDialog } from "@/screens/shared/add-employee/AddEmployeeDialog";
import type { Metric } from "./logic/useEmployeeCharts";
import { employeesStyles as s } from "./employees.styles";
import { useEmployeesScreen } from "./logic/useEmployeesScreen";

export function EmployeesScreen() {
  const vm = useEmployeesScreen();
  const { t, charts } = vm;

  return (
    <>
      <PageHeader
        title={t("employees.title")}
        titleAside={vm.companyName}
        actions={<Button variant="primary" icon="plus" label={t("employees.add.action")} onPress={vm.addEmployee.show} />}
      />
      <AddEmployeeDialog form={vm.addEmployee} />

      <div className={s.stats}>
        <div className={s.stat}><Stat icon="user-check" label={t("employees.stats.active")} value={<Text size="lg" weight="semibold" numeric>{vm.stats.active}</Text>} /></div>
        <div className={s.stat}><Stat icon="user-x" label={t("employees.stats.inactive")} value={<Text size="lg" weight="semibold" numeric tone="muted">{vm.stats.inactive}</Text>} /></div>
        <div className={s.stat}><Stat icon="receipt" label={t("payroll.stats.net")} value={<Money value={vm.stats.net} size="lg" weight="semibold" tone="accent" />} /></div>
        <div className={s.stat}><Stat icon="building" label={t("payroll.stats.cost")} value={<Money value={vm.stats.cost} size="lg" weight="semibold" />} /></div>
        <div className={s.stat}><Stat icon="piggy-bank" label={t("employees.stats.pension")} value={<Money value={vm.stats.pension} size="lg" weight="semibold" />} /></div>
        <div className={s.stat}><Stat icon="shield" label={t("employees.stats.insurance")} value={<Money value={vm.stats.insurance} size="lg" weight="semibold" />} /></div>
        <div className={s.stat}><Stat icon="heart" label={t("employees.stats.health")} value={<Money value={vm.stats.health} size="lg" weight="semibold" />} /></div>
      </div>

      <div className={s.toolbar}>
        <div className={s.search}>
          <SearchInput value={vm.query} onChange={vm.setQuery} placeholder={t("employees.search")} />
        </div>
        <SegmentedControl
          value={vm.status}
          onChange={vm.setStatus}
          options={[
            { value: "active", label: t("employees.filters.active") },
            { value: "inactive", label: t("employees.filters.inactive") },
            { value: "all", label: t("employees.filters.all") },
          ]}
        />
      </div>

      {vm.loading ? (
        <Skeleton shape="tall" />
      ) : (
        <DataGrid<EmployeeRecord>
          readOnly
          ariaLabel={t("employees.title")}
          rows={vm.rows}
          rowKey={(r) => r.employee.employee_id}
          onSelect={vm.open}
          empty={<EmptyState icon="search" title={t("employees.empty")} />}
          columns={[
            {
              id: "name",
              header: t("employees.columns.name"),
              sticky: true,
              sortValue: vm.nameOf,
              cell: (r) => (
                <div className={s.person}>
                  <Avatar name={vm.nameOf(r)} size="sm" />
                  <div className={s.personText}>
                    <Text weight="medium" truncate>{vm.nameOf(r)}</Text>
                    <Text size="xs" tone="subtle" truncate>{r.profile.email}</Text>
                  </div>
                </div>
              ),
            },
            { id: "id", header: t("employees.columns.nationalId"), cell: (r) => <MonoText value={r.profile.national_id} /> },
            { id: "department", header: t("employees.columns.department"), sortValue: (r) => r.profile.department ?? "", cell: (r) => <Text>{r.profile.department}</Text> },
            { id: "position", header: t("employees.columns.position"), cell: (r) => <Text tone="muted">{r.profile.position}</Text> },
            { id: "kind", header: t("employees.columns.kind"), cell: (r) => <Badge tone="outline" label={t(`employee.kinds.${r.employee.kind}`)} /> },
            {
              id: "pay",
              header: t("employees.columns.pay"),
              align: "end",
              sortValue: (r) => Number(r.employee.monthly_salary ?? r.employee.hourly_rate ?? 0),
              cell: (r) => <Money value={r.employee.monthly_salary ?? r.employee.hourly_rate} />,
            },
            { id: "start", header: t("employees.columns.start"), sortValue: (r) => r.employee.start_date, cell: (r) => <DateText value={r.employee.start_date} /> },
            {
              id: "status",
              header: t("employees.columns.status"),
              cell: (r) =>
                vm.isActive(r) ? (
                  r.employee.pension ? null : <Badge tone="warning" label={t("employees.pensionNo")} />
                ) : (
                  <Badge tone="neutral" label={vm.leftLabel(r)} />
                ),
            },
          ]}
        />
      )}

      <div className={s.charts}>
        <Card
          title={t("employees.charts.shareTitle")}
          actions={
            <div className={s.filters}>
              <div className={s.metric}>
                <Select
                  size="sm"
                  ariaLabel={t("employees.charts.metric")}
                  value={charts.metric}
                  onChange={(v) => charts.setMetric(v as Metric)}
                  options={charts.metricOptions}
                />
              </div>
              <MultiSelect
                icon="users"
                label={t("breakdown.employees")}
                summary={charts.share.summary}
                options={charts.share.options}
                onToggle={charts.share.toggle}
                onAll={charts.share.all}
                onNone={charts.share.none}
                allLabel={t("common.selectAll")}
                noneLabel={t("common.selectNone")}
              />
            </div>
          }
        >
          {vm.chartsLoading ? (
            <Skeleton shape="tall" />
          ) : (
            <BreakdownChart
              slices={charts.share.slices}
              centerLabel={t(`employees.metrics.${charts.metric}`)}
              formatValue={charts.money}
              formatPercent={charts.percent}
              emptyLabel={t("breakdown.empty")}
            />
          )}
        </Card>

        <Card
          title={t("employees.charts.barsTitle")}
          subtitle={t("employees.charts.barsSubtitle")}
          actions={
            <MultiSelect
              icon="users"
              label={t("breakdown.employees")}
              summary={charts.bars.summary}
              options={charts.bars.options}
              onToggle={charts.bars.toggle}
              onAll={charts.bars.all}
              onNone={charts.bars.none}
              allLabel={t("common.selectAll")}
              noneLabel={t("common.selectNone")}
            />
          }
        >
          {vm.chartsLoading ? (
            <Skeleton shape="tall" />
          ) : charts.bars.data.length ? (
            <HorizontalBarChart
              data={charts.bars.data}
              series={charts.bars.series}
              formatValue={charts.money}
              formatAxis={charts.moneyCompact}
              rowHeight={56}
              labelWidth={130}
            />
          ) : (
            <EmptyState icon="users" title={t("breakdown.empty")} />
          )}
        </Card>
      </div>
    </>
  );
}
