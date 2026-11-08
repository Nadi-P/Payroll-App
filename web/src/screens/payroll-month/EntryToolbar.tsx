"use client";

import { Button } from "@/components/actions/button/Button";
import { Dialog } from "@/components/overlays/dialog/Dialog";
import type { PayrollMonthVM } from "./logic/usePayrollMonth";
import { sectionTableStyles as s } from "./payrollMonth.styles";

/** Changes to many employees at once: start from last month, or one amount for several people. */
export function EntryToolbar({ vm }: { vm: PayrollMonthVM }) {
  const { t } = vm;
  if (!vm.canEdit) return null;
  return (
    <div className={s.toolbar}>
      <Button variant="ghost" icon="history" label={t("payroll.entry.copy", { month: vm.previousLabel })} onPress={vm.askCopy} />
      <Button variant="secondary" icon="users" label={t("payroll.entry.apply")} onPress={vm.apply.show} />
      <Dialog
        size="sm"
        open={vm.copyOpen}
        onOpenChange={(o) => !o && vm.closeCopy()}
        title={t("payroll.entry.copyTitle", { month: vm.previousLabel })}
        description={t("payroll.entry.copyBody", { month: vm.monthLabel })}
        closeLabel={t("common.close")}
        footer={
          <>
            <Button variant="ghost" label={t("common.cancel")} onPress={vm.closeCopy} />
            <Button variant="primary" icon="history" label={t("payroll.entry.copyAction")} loading={vm.copying} onPress={vm.copyPrevious} />
          </>
        }
      >
        {null}
      </Dialog>
    </div>
  );
}
