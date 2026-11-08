export const appShellStyles = {
  root: "flex min-h-dvh bg-bg",
  main: "flex min-w-0 flex-1 flex-col",
  /** Small screens only: the sidebar is a drawer, so something has to open it. */
  mobileBar:
    "sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur-md lg:hidden print:hidden",
  mobileSpacer: "flex-1",
  content: "page-view mx-auto flex w-full max-w-[1520px] flex-1 flex-col gap-6 px-4 py-7 sm:px-6 lg:px-10 print:max-w-none print:p-0",
  prefs: "flex items-center gap-1",
  language: "flex-1",
  tools: "flex flex-wrap items-center gap-x-4 gap-y-1 px-1",
};
