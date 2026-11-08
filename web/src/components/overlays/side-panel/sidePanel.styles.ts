import { cva } from "class-variance-authority";

export const sidePanelStyles = {
  overlay: "fixed inset-0 z-40 animate-fade-in bg-black/25",
  content: cva(
    "fixed inset-y-0 end-0 z-50 flex w-full animate-slide-in flex-col border-s border-border bg-surface shadow-lg outline-none",
    { variants: { size: { md: "max-w-md", lg: "max-w-xl" } }, defaultVariants: { size: "md" } },
  ),
  header: "flex items-start justify-between gap-3 border-b border-border px-5 py-4",
  headerText: "flex min-w-0 flex-col gap-1",
  title: "text-[15px] font-semibold text-text",
  subtitle: "text-[13px] text-muted",
  body: "min-h-0 flex-1 overflow-y-auto px-5 py-4",
  footer: "flex items-center justify-between gap-2 border-t border-border px-5 py-3",
};
