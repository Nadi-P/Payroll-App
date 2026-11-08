"use client";

import type { ComponentPropsWithRef } from "react";
import { Tooltip } from "@/components/overlays/tooltip/Tooltip";
import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { iconButtonStyles, type IconButtonVariants } from "./iconButton.styles";

interface IconButtonProps extends IconButtonVariants, Omit<ComponentPropsWithRef<"button">, "className" | "children"> {
  icon: IconName;
  /** Accessible name, also shown as the tooltip. */
  label: string;
  onPress?: () => void;
}

/** Extra props (ref, aria, handlers) are passed through so menus can use it as their trigger. */
export function IconButton({ icon, label, onPress, variant, size, ...rest }: IconButtonProps) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onPress}
        className={iconButtonStyles({ variant, size })}
        {...rest}
      >
        <Icon name={icon} />
      </button>
    </Tooltip>
  );
}
