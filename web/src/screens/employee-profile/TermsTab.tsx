"use client";

import { Card } from "@/components/surfaces/card/Card";
import { FundsEditor } from "@/screens/shared/terms/FundsEditor";
import { PayTermsEditor } from "@/screens/shared/terms/PayTermsEditor";
import { StandingEditor } from "@/screens/shared/terms/StandingEditor";
import { employeeProfileStyles as s } from "./employeeProfile.styles";
import type { EmployeeProfileVM } from "./logic/useEmployeeProfile";

/** The employment terms: pay and placement, standing amounts, and provident funds. */
export function TermsTab({ vm }: { vm: EmployeeProfileVM }) {
  const { t, draft } = vm;
  if (!draft) return null;
  const readOnly = !vm.canEdit;
  return (
    <div className={s.tabBody}>
      <Card title={t("terms.pay")}>
        <PayTermsEditor record={draft} onChange={vm.setRecord} readOnly={readOnly} />
      </Card>
      <Card title={t("terms.standing")}>
        <StandingEditor record={draft} onChange={vm.setRecord} readOnly={readOnly} options={vm.standingOptions} />
      </Card>
      <Card title={t("terms.funds")}>
        <FundsEditor record={draft} onChange={vm.setRecord} readOnly={readOnly} />
      </Card>
    </div>
  );
}
