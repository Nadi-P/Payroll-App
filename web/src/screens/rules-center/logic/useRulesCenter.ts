"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { useCoverage, useMeta, useRules } from "@/api/queries";
import type { RuleEntry } from "@/api/types.generated";
import { ruleNameKey } from "@/screens/shared/logic/flags";

export type RuleFilter = "current" | "unverified" | "all";

const COVERAGE = { first: "2025-01", last: "2027-12" };

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function useRulesCenter() {
  const t = useTranslations();
  const rules = useRules();
  const meta = useMeta();
  const coverage = useCoverage(COVERAGE.first, COVERAGE.last);
  const [filter, setFilter] = useState<RuleFilter>("current");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<RuleEntry | null>(null);

  const nameOf = useCallback(
    (r: RuleEntry) => (t.has(ruleNameKey(r.rule_id)) ? t(ruleNameKey(r.rule_id)) : r.rule_id),
    [t],
  );
  const now = today();
  const inForce = useCallback(
    (r: RuleEntry) => r.effective_from <= now && (r.effective_to == null || now <= r.effective_to),
    [now],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rules.data ?? []).filter((r) => {
      if (filter === "current" && !inForce(r)) return false;
      if (filter === "unverified" && r.verified) return false;
      return !q || `${r.rule_id} ${nameOf(r)} ${r.source}`.toLowerCase().includes(q);
    });
  }, [rules.data, filter, query, inForce, nameOf]);

  const all = rules.data ?? [];
  const gaps = coverage.data ?? [];
  return {
    t,
    loading: rules.isLoading,
    version: meta.data?.version ?? "",
    stats: {
      rules: new Set(all.map((r) => r.rule_id)).size,
      versions: all.length,
      unverified: all.filter((r) => !r.verified && inForce(r)).length,
    },
    coverage: COVERAGE,
    coverageChecked: coverage.isSuccess,
    gaps,
    gapMonths: [...new Set(gaps.map((g) => `${g.period.year}-${String(g.period.month).padStart(2, "0")}`))],
    filter,
    setFilter,
    query,
    setQuery,
    rows,
    nameOf,
    inForce,
    open,
    show: setOpen,
    close: () => setOpen(null),
    valueJson: (r: RuleEntry) => JSON.stringify(r.value, null, 2),
  };
}
