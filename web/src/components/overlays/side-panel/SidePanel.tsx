"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { sidePanelStyles as s } from "./sidePanel.styles";

interface SidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: ReactNode;
  closeLabel: string;
  size?: "md" | "lg";
  footer?: ReactNode;
  children: ReactNode;
}

/** A panel that slides in from the end edge (right in LTR, left in RTL). */
export function SidePanel({ open, onOpenChange, title, subtitle, closeLabel, size, footer, children }: SidePanelProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={s.overlay} />
        <RadixDialog.Content className={s.content({ size })} aria-describedby={undefined}>
          <div className={s.header}>
            <div className={s.headerText}>
              <RadixDialog.Title className={s.title}>{title}</RadixDialog.Title>
              {subtitle ? <div className={s.subtitle}>{subtitle}</div> : null}
            </div>
            <RadixDialog.Close asChild>
              <IconButton icon="x" label={closeLabel} size="sm" />
            </RadixDialog.Close>
          </div>
          <div className={s.body}>{children}</div>
          {footer ? <div className={s.footer}>{footer}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
