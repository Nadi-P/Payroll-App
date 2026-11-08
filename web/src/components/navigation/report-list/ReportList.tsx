"use client";

import { Select } from "@/components/inputs/select/Select";
import { Icon } from "@/components/typography/icon/Icon";
import { reportListStyles as s } from "./reportList.styles";
import type { ReportListGroup } from "./reportList.types";

interface ReportListProps {
  groups: ReportListGroup[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}

/** A grouped list of reports to choose from; a dropdown on small screens. */
export function ReportList({ groups, value, onChange, ariaLabel }: ReportListProps) {
  return (
    <nav aria-label={ariaLabel} className={s.root}>
      <div className={s.compact}>
        <Select
          ariaLabel={ariaLabel}
          value={value}
          onChange={onChange}
          options={groups.flatMap((g) => g.items.map((i) => ({ value: i.id, label: i.label, hint: g.title })))}
        />
      </div>
      <div className={s.panel}>
        {groups.map((group) => (
          <div key={group.id} role="group" aria-label={group.title} className={s.group}>
            <div className={s.groupTitle}>{group.title}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={item.id === value ? "page" : undefined}
                onClick={() => onChange(item.id)}
                className={s.item({ active: item.id === value })}
              >
                {item.icon ? <Icon name={item.icon} size="sm" /> : null}
                <span className={s.label}>
                  <span className={s.name}>{item.label}</span>
                  {item.meta ? <span className={s.meta}>{item.meta}</span> : null}
                </span>
                {item.tone ? <span role="img" aria-label={item.toneLabel} className={s.dot({ tone: item.tone })} /> : null}
              </button>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}
