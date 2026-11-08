import { cva } from "class-variance-authority";

export const sidebarStyles = {
  scrim: cva("fixed inset-0 z-30 bg-black/30 lg:hidden", {
    variants: { open: { true: "block animate-fade-in", false: "hidden" } },
  }),
  root: cva(
    "fixed inset-y-0 start-0 z-40 flex w-[17rem] flex-col print:hidden border-e border-border bg-sidebar transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:translate-x-0",
    {
      variants: {
        open: { true: "translate-x-0", false: "-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0" },
      },
    },
  ),
  brand: "flex h-16 shrink-0 items-center px-5",
  header: "flex shrink-0 flex-col gap-2 px-3 pb-2",
  nav: "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4 pt-3",
  section: "flex flex-col",
  sectionTitle: "truncate px-3 pb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-subtle",
  item: cva(
    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14.5px] font-medium transition-colors",
    {
      variants: {
        active: {
          true: "bg-accent-soft text-accent-ink before:absolute before:inset-y-2 before:-start-3 before:w-[3px] before:rounded-e-full before:bg-accent",
          false: "text-muted hover:bg-surface-2 hover:text-text",
        },
        soon: { true: "opacity-60", false: "" },
      },
    },
  ),
  itemLabel: "min-w-0 flex-1 truncate",
  footer: "flex shrink-0 flex-col gap-2 border-t border-border px-3 py-3",
};
