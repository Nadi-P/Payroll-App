"use client";

import { TextLink } from "@/components/actions/text-link/TextLink";
import { Badge } from "@/components/feedback/badge/Badge";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { IssueItem } from "@/components/feedback/issue-item/IssueItem";
import { Skeleton } from "@/components/feedback/skeleton/Skeleton";
import { TabBar } from "@/components/navigation/tab-bar/TabBar";
import { Card } from "@/components/surfaces/card/Card";
import { PageHeader } from "@/components/surfaces/page-header/PageHeader";
import { Icon } from "@/components/typography/icon/Icon";
import { Text } from "@/components/typography/text/Text";
import { exceptionsStyles as s } from "./exceptions.styles";
import { useExceptions } from "./logic/useExceptions";

export function ExceptionsScreen() {
  const vm = useExceptions();
  const { t } = vm;

  return (
    <>
      <PageHeader
        eyebrow={<Badge tone="accent" label={vm.monthLabel} />}
        title={t("exceptions.title")}
        subtitle={t("exceptions.subtitle", { company: vm.companyName })}
        actions={<TextLink href={vm.payrollHref} icon="wallet" label={t("exceptions.backToPayroll")} />}
      />

      <TabBar
        ariaLabel={t("exceptions.title")}
        value={vm.filter}
        onChange={vm.setFilter}
        tabs={[
          { value: "all", label: t("exceptions.filters.all"), count: vm.count("all") },
          { value: "error", label: t("exceptions.filters.error"), count: vm.count("error"), countTone: "danger" },
          { value: "warning", label: t("exceptions.filters.warning"), count: vm.count("warning"), countTone: "warning" },
          { value: "info", label: t("exceptions.filters.info"), count: vm.count("info") },
        ]}
      />

      <div className={s.layout}>
        {vm.loading ? (
          <Skeleton shape="tall" />
        ) : vm.items.length === 0 ? (
          <Card>
            <EmptyState icon="check-circle" title={t("exceptions.emptyTitle")} body={t("exceptions.emptyBody")} />
          </Card>
        ) : (
          <div className={s.list}>
            {vm.items.map((item) => (
              <IssueItem
                key={item.key}
                severity={item.severity}
                title={item.title}
                detail={item.hint}
                meta={<Badge tone="neutral" label={item.employee} />}
                action={<TextLink href={item.href} label={t("exceptions.fix")} />}
              />
            ))}
          </div>
        )}

        <div className={s.side}>
          <Card title={t("exceptions.legend.title")}>
            <div className={s.legend}>
              <div className={s.legendRow}><Icon name="alert-circle" tone="danger" size="sm" /><Text size="sm">{t("exceptions.legend.error")}</Text></div>
              <div className={s.legendRow}><Icon name="alert-triangle" tone="warning" size="sm" /><Text size="sm">{t("exceptions.legend.warning")}</Text></div>
              <div className={s.legendRow}><Icon name="info" tone="info" size="sm" /><Text size="sm">{t("exceptions.legend.info")}</Text></div>
            </div>
          </Card>
          {vm.unverified ? (
            <Card tone="warning" title={t("exceptions.trust.title")} subtitle={t("exceptions.trust.body", { count: vm.unverified })}>
              <TextLink href="/rules" label={t("shell.viewRules")} />
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
