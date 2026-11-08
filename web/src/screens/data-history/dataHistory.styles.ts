import { cva } from "class-variance-authority";

export const dataHistoryStyles = {
  gallery: "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
  // Workspace: fills the screen height so the table scrolls inside, not the page.
  workspace: "flex min-h-0 flex-col gap-3 lg:h-[calc(100dvh-3.5rem)]",
  bar: "flex flex-wrap items-center gap-3",
  barTitle: "flex min-w-0 flex-1 items-center gap-2",
  barActions: "flex flex-wrap items-center gap-2",
  body: cva("flex min-h-0 flex-1 flex-col gap-3 lg:flex-row", { variants: { analysis: { true: "overflow-y-auto", false: "" } } }),
  main: "flex min-h-[28rem] min-w-0 flex-1 flex-col",
  // Analysis
  analysis: "flex min-w-0 flex-1 flex-col gap-4",
  stats: "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4",
  stat: "rounded-xl border border-border bg-surface p-4 shadow-sm",
  blocks: "grid items-start gap-4 xl:grid-cols-2",
  wide: "xl:col-span-2",
};
