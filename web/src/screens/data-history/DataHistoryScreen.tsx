"use client";

import { PageHeader } from "@/components/surfaces/page-header/PageHeader";
import { useDataHistory } from "./logic/useDataHistory";
import { ReportGallery } from "./ReportGallery";
import { ReportWorkspace } from "./ReportWorkspace";

/** Closed months, reviewed through reports: pick one from the gallery, then explore it. */
export function DataHistoryScreen() {
  const vm = useDataHistory();
  if (vm.report) return <ReportWorkspace vm={vm} />;
  return (
    <>
      <PageHeader title={vm.t("dataHistory.title")} subtitle={vm.companyName} />
      <ReportGallery vm={vm} />
    </>
  );
}
