"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { IconButton } from "@/components/actions/icon-button/IconButton";
import { dialogStyles as s } from "./dialog.styles";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  closeLabel: string;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, title, description, closeLabel, size, footer, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={s.overlay} />
        <RadixDialog.Content className={s.content({ size })} {...(description ? {} : { "aria-describedby": undefined })}>
          <div className={s.header}>
            <div className={s.headerText}>
              <RadixDialog.Title className={s.title}>{title}</RadixDialog.Title>
              {description ? <RadixDialog.Description className={s.description}>{description}</RadixDialog.Description> : null}
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
