import { cva } from "class-variance-authority";

export const dialogStyles = {
  overlay: "fixed inset-0 z-40 animate-fade-in bg-black/40 backdrop-blur-[2px]",
  content: cva(
    "fixed start-1/2 top-[12vh] z-50 flex max-h-[76vh] w-[calc(100vw-2rem)] -translate-x-1/2 animate-pop-in flex-col rounded-xl border border-border bg-surface shadow-lg outline-none rtl:translate-x-1/2",
    { variants: { size: { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" } }, defaultVariants: { size: "md" } },
  ),
  header: "flex items-start justify-between gap-3 border-b border-border px-5 py-4",
  headerText: "flex flex-col gap-1",
  title: "text-[15px] font-semibold text-text",
  description: "text-[13px] text-muted",
  body: "min-h-0 flex-1 overflow-y-auto px-5 py-4",
  footer: "flex items-center justify-end gap-2 border-t border-border px-5 py-3",
};
