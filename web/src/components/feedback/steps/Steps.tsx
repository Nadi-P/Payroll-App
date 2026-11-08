import { Fragment } from "react";
import { Icon } from "@/components/typography/icon/Icon";
import { stepMarker, stepStyles, stepsStyles } from "./steps.styles";

interface StepsProps {
  steps: { id: string; label: string }[];
  current: number;
  onStepClick?: (index: number) => void;
}

export function Steps({ steps, current, onStepClick }: StepsProps) {
  return (
    <ol className={stepsStyles.root}>
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "upcoming";
        const clickable = !!onStepClick && i <= current;
        return (
          <Fragment key={step.id}>
            {i > 0 ? <li aria-hidden className={stepsStyles.connector} /> : null}
            <li>
              <button
                type="button"
                disabled={!clickable}
                aria-current={state === "current" ? "step" : undefined}
                onClick={() => onStepClick?.(i)}
                className={stepStyles({ state, clickable })}
              >
                <span className={stepMarker({ state })}>
                  {state === "done" ? <Icon name="check" size="xs" /> : i + 1}
                </span>
                {step.label}
              </button>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
