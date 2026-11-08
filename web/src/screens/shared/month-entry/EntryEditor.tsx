"use client";

import { useTranslations } from "next-intl";
import { TabBar } from "@/components/navigation/tab-bar/TabBar";
import { SECTIONS, type Section } from "@/screens/shared/logic/payrollSections";
import { AbsencesEditor } from "./AbsencesEditor";
import { DeductionsEditor } from "./DeductionsEditor";
import { FundsPanel } from "./FundsPanel";
import { ImputedEditor } from "./ImputedEditor";
import type { EditorProps } from "./logic/editorProps";
import { monthEntryStyles as s } from "./monthEntry.styles";
import { PaymentsEditor } from "./PaymentsEditor";

interface EntryEditorProps extends EditorProps {
  section: Section;
  onSection: (section: Section) => void;
  /** Where the employee's employment terms are edited (funds and standing amounts). */
  termsHref?: string;
}

/** One employee's month, in the five sections, ready to edit. */
export function EntryEditor({ section, onSection, termsHref, ...props }: EntryEditorProps) {
  const t = useTranslations();
  return (
    <div className={s.root}>
      <TabBar
        ariaLabel={t("sections.label")}
        value={section}
        onChange={onSection}
        tabs={SECTIONS.map((id) => ({ value: id, label: t(`sections.${id}`) }))}
      />
      {section === "payments" ? <PaymentsEditor {...props} /> : null}
      {section === "imputed" ? <ImputedEditor {...props} /> : null}
      {section === "deductions" ? <DeductionsEditor {...props} /> : null}
      {section === "funds" ? <FundsPanel {...props} termsHref={termsHref} /> : null}
      {section === "absences" ? <AbsencesEditor {...props} /> : null}
    </div>
  );
}
