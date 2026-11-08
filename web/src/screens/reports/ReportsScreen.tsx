"use client";

import { ReportList } from "@/components/navigation/report-list/ReportList";
import { PageHeader } from "@/components/surfaces/page-header/PageHeader";
import { FilingView } from "./FilingView";
import { useReports } from "./logic/useReports";
import { reportsStyles as s } from "./reports.styles";

/** Every report the law requires, by when it is due, ready to check, print and export. */
export function ReportsScreen() {
  const vm = useReports();
  const { t } = vm;
  return (
    <>
      <PageHeader title={t("exports.title")} subtitle={vm.companyName} />
      <div className={s.layout}>
        <div className={s.aside}>
          <ReportList ariaLabel={t("exports.title")} groups={vm.groups} value={vm.selected} onChange={vm.select} />
        </div>
        <div className={s.main}>
          <FilingView vm={vm} />
        </div>
      </div>
    </>
  );
}
