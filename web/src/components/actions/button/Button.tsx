"use client";

import type { ComponentPropsWithRef } from "react";
import { Spinner } from "@/components/feedback/spinner/Spinner";
import { Icon } from "@/components/typography/icon/Icon";
import type { IconName } from "@/components/typography/icon/icon.logic";
import { Kbd } from "@/components/typography/kbd/Kbd";
import { buttonStyles, type ButtonVariants } from "./button.styles";

interface ButtonProps extends ButtonVariants, Omit<ComponentPropsWithRef<"button">, "className" | "children" | "type"> {
  label: string;
  icon?: IconName;
  iconEnd?: IconName;
  shortcut?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
}

/** Extra props (ref, aria, handlers) are passed through so menus can use it as their trigger. */
export function Button({
  label,
  icon,
  iconEnd,
  shortcut,
  onPress,
  disabled,
  loading,
  type = "button",
  variant,
  size,
  fullWidth,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onPress}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, fullWidth })}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : icon ? <Icon name={icon} size="sm" /> : null}
      {label}
      {iconEnd ? <Icon name={iconEnd} size="sm" /> : null}
      {shortcut ? <Kbd keys={shortcut} /> : null}
    </button>
  );
}
