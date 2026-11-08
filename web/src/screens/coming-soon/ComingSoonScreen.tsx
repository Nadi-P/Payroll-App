"use client";

import { Badge } from "@/components/feedback/badge/Badge";
import { EmptyState } from "@/components/feedback/empty-state/EmptyState";
import { Card } from "@/components/surfaces/card/Card";
import { Icon } from "@/components/typography/icon/Icon";
import { Text } from "@/components/typography/text/Text";
import { comingSoonStyles as s } from "./comingSoon.styles";
import { useComingSoon, type Feature } from "./logic/useComingSoon";

export function ComingSoonScreen({ feature }: { feature: Feature }) {
  const vm = useComingSoon(feature);
  return (
    <div className={s.wrap}>
      <Card>
        <EmptyState icon={vm.icon} title={vm.title} body={vm.body} action={<Badge tone="accent" size="md" label={vm.t("nav.soon")} />} />
        <div className={s.points}>
          {vm.points.map((point) => (
            <div key={point} className={s.point}>
              <Icon name="check-circle" size="sm" tone="accent" />
              <Text size="sm">{point}</Text>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
