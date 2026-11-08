export const pageLoaderStyles = {
  // Appears only after a short delay, so quick page changes never flash it.
  root: "pointer-events-none fixed inset-x-0 bottom-0 top-16 z-10 flex animate-loader-in flex-col items-center justify-center gap-5 lg:start-[17rem]",
  mark: "relative size-16",
  svg: "relative z-10 size-16 animate-loader-breathe",
  tile: "fill-surface stroke-border [stroke-width:1.5]",
  track: "fill-none stroke-accent/20 [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:4]",
  trace:
    "fill-none stroke-accent [stroke-dasharray:32_68] [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:4] animate-loader-trace",
  arrow: "fill-none stroke-accent/50 [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.5]",
  glow: "absolute inset-1 rounded-2xl bg-accent/25 blur-xl animate-loader-glow",
  // Fixed left-to-right track, so the line runs right to left in every language.
  bar: "h-0.5 w-24 overflow-hidden rounded-full bg-surface-3 [direction:ltr]",
  // Half a cycle ahead: the line is slowest mid-track at the moment the P trace is slowest.
  barFill: "h-full w-1/3 rounded-full bg-accent animate-loader-bar [animation-delay:-600ms]",
};
