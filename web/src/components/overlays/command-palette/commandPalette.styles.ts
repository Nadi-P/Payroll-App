export const commandPaletteStyles = {
  srOnly: "sr-only",
  overlay: "fixed inset-0 z-40 animate-fade-in bg-black/40 backdrop-blur-[2px]",
  content:
    "fixed start-1/2 top-[14vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 animate-pop-in overflow-hidden rounded-xl border border-border bg-surface shadow-lg outline-none rtl:translate-x-1/2",
  inputRow: "flex items-center gap-2.5 border-b border-border px-4",
  input: "h-12 w-full bg-transparent text-sm text-text outline-none placeholder:text-subtle",
  list: "max-h-[50vh] overflow-y-auto p-1.5",
  empty: "px-3 py-8 text-center text-[13px] text-muted",
  group:
    "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-subtle",
  item:
    "flex h-9 cursor-default select-none items-center gap-2.5 rounded-md px-2.5 text-[13px] text-text outline-none data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-ink",
  itemText: "min-w-0 flex-1 truncate",
  hint: "text-xs text-subtle",
  footer: "flex items-center gap-3 border-t border-border bg-surface-2 px-4 py-2 text-[11px] text-subtle",
  footerItem: "inline-flex items-center gap-1.5",
};
