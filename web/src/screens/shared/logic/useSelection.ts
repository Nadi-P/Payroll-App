"use client";

import { useState } from "react";

/**
 * A set of excluded ids over a list of options: everything is included until the user
 * leaves something out, so new options (a new employee, a new pay line) show up by default.
 */
export function useSelection() {
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  return {
    has: (id: string) => !excluded.has(id),
    toggle: (id: string) =>
      setExcluded((cur) => {
        const next = new Set(cur);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    all: () => setExcluded(new Set()),
    none: (ids: string[]) => setExcluded(new Set(ids)),
    /** "3/5" for a filter trigger. */
    summary: (ids: string[]) => `${ids.filter((id) => !excluded.has(id)).length}/${ids.length}`,
  };
}
