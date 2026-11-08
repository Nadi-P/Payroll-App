"use client";

import { Badge } from "@/components/feedback/badge/Badge";
import { SidePanel } from "@/components/overlays/side-panel/SidePanel";
import { DateText } from "@/components/typography/date-text/DateText";
import { Heading } from "@/components/typography/heading/Heading";
import { Icon } from "@/components/typography/icon/Icon";
import { MonoText } from "@/components/typography/mono-text/MonoText";
import { Money } from "@/components/typography/money/Money";
import { NumberText } from "@/components/typography/number-text/NumberText";
import { Text } from "@/components/typography/text/Text";
import { explainPanelStyles as s } from "./explainPanel.styles";
import type { ExplainState } from "./logic/useExplain";

/** "How was this calculated?" — formula, inputs, result and the legal sources in force. */
export function ExplainPanel({ explain }: { explain: ExplainState }) {
  const { t, target } = explain;
  return (
    <SidePanel
      open={!!target}
      onOpenChange={(o) => !o && explain.close()}
      title={target?.title ?? ""}
      subtitle={t("explain.subtitle")}
      closeLabel={t("common.close")}
      footer={
        <div className={s.footer}>
          <Icon name="shield" size="sm" tone="subtle" />
          <Text size="xs" tone="subtle">
            {t("shell.lawVersion", { version: target?.entry.ruleset_version ?? "" })}
          </Text>
        </div>
      }
    >
      {target ? (
        <div className={s.body}>
          <div className={s.result}>
            <Text weight="medium">{t("explain.result")}</Text>
            {target.unit === "days" ? (
              <NumberText value={target.entry.result} unit={t("units.days")} size="lg" />
            ) : (
              <Money value={target.entry.result} size="xl" weight="semibold" />
            )}
          </div>

          <div className={s.section}>
            <Heading level={3}>{t("explain.formula")}</Heading>
            <MonoText block value={target.entry.formula} />
          </div>

          {explain.inputs.length ? (
            <div className={s.section}>
              <Heading level={3}>{t("explain.inputsTitle")}</Heading>
              <div className={s.inputs}>
                {explain.inputs.map((input) => (
                  <div key={input.key} className={s.inputRow}>
                    <Text size="sm" tone="muted">{input.label}</Text>
                    <MonoText value={input.value} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {explain.sources.length ? (
            <div className={s.section}>
              <Heading level={3}>{t("explain.sources")}</Heading>
              <div className={s.sources}>
                {explain.sources.map((src) => (
                  <div key={src.id} className={s.source}>
                    <div className={s.sourceHead}>
                      <Text size="sm" weight="medium">{src.title}</Text>
                      <Badge
                        tone={src.verified ? "success" : "warning"}
                        label={src.verified ? t("rules.verified") : t("rules.unverified")}
                      />
                    </div>
                    <Text size="xs" tone="muted">{src.source}</Text>
                    <div className={s.dates}>
                      <DateText value={src.from} />
                      <Icon name="chevron-forward" size="xs" />
                      {src.to ? <DateText value={src.to} /> : t("rules.openEnded")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </SidePanel>
  );
}
