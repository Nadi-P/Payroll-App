import type { Payslip } from "@/api/types.generated";
import type { TableColumn } from "@/components/data/data-table/dataTable.types";
import { deductionParts, earningParts, employerParts, sumParts, type Part } from "./payslipParts";

type Translate = (key: string) => string;
type NameOf = (code: string) => string;

const n = (v: string) => Number(v);

export interface ComponentRow {
  id: string;
  parts: Map<string, number>;
  gross: number;
  benefits: number;
  net: number;
  cost: number;
}

function benefitParts(p: Payslip, nameOf: NameOf): Part[] {
  return p.lines
    .filter((l) => l.kind === "benefit")
    .map((l) => ({ key: `benefit:${l.code}`, label: nameOf(l.code), value: n(l.amount) }));
}

function allParts(p: Payslip, t: Translate, nameOf: NameOf) {
  return {
    earnings: earningParts(p, nameOf),
    benefits: benefitParts(p, nameOf),
    deductions: deductionParts(p, t, nameOf),
    employer: employerParts(p, t),
  };
}

/** One table row out of any number of payslips: a person's month, a month, a person's year... */
export function componentRow(id: string, slips: Payslip[], t: Translate, nameOf: NameOf): ComponentRow {
  const parts = new Map<string, number>();
  for (const p of slips) {
    const { earnings, benefits, deductions, employer } = allParts(p, t, nameOf);
    for (const part of [...earnings, ...benefits, ...deductions, ...employer])
      parts.set(part.key, (parts.get(part.key) ?? 0) + part.value);
  }
  const total = (pick: (p: Payslip) => string) => slips.reduce((a, p) => a + n(pick(p)), 0);
  return {
    id,
    parts,
    gross: total((p) => p.bases.gross_cash),
    benefits: total((p) => p.bases.benefits),
    net: total((p) => p.net_pay),
    cost: total((p) => p.employer_cost),
  };
}

/**
 * Every component that appears in these payslips, in the order a payslip reads: pay, gross,
 * non-cash values, deductions, net, employer side, employer cost. Empty components are left out.
 */
export function componentColumns<Row extends ComponentRow>(slips: Payslip[], t: Translate, nameOf: NameOf): TableColumn<Row>[] {
  const lists = slips.map((p) => allParts(p, t, nameOf));
  const used = (pick: (l: (typeof lists)[number]) => Part[]) =>
    sumParts(lists.map(pick)).filter((p) => Math.abs(p.value) > 0.005);
  const partColumn = (part: Part): TableColumn<Row> => ({
    id: part.key,
    header: part.label,
    format: "money",
    total: true,
    value: (row) => row.parts.get(part.key) ?? 0,
  });
  const fixed = (id: keyof ComponentRow & string, header: string): TableColumn<Row> => ({
    id,
    header,
    format: "money",
    total: true,
    value: (row) => Number(row[id]),
  });
  return [
    ...used((l) => l.earnings).map(partColumn),
    fixed("gross", t("payroll.stats.gross")),
    ...used((l) => l.benefits).map(partColumn),
    ...used((l) => l.deductions).map(partColumn),
    fixed("net", t("payroll.stats.net")),
    ...used((l) => l.employer).map(partColumn),
    fixed("cost", t("payroll.stats.cost")),
  ];
}
