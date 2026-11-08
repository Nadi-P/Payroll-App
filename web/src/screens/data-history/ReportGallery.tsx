"use client";

import { Badge } from "@/components/feedback/badge/Badge";
import { ActionCard } from "@/components/surfaces/action-card/ActionCard";
import { dataHistoryStyles as s } from "./dataHistory.styles";
import type { DataHistoryVM } from "./logic/useDataHistory";

/** The base reports, one card each; a card opens its report. */
export function ReportGallery({ vm }: { vm: DataHistoryVM }) {
  return (
    <div className={s.gallery}>
      {vm.gallery.map((card) => (
        <ActionCard
          key={card.id}
          icon={card.icon}
          title={card.title}
          description={card.description}
          footer={<Badge tone="outline" label={card.section} />}
          onPress={() => vm.open(card.id)}
        />
      ))}
    </div>
  );
}
