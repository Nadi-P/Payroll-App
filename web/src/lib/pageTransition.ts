/**
 * Page changes, animated.
 *
 * A click starts the change at once: the current page slides away (from the sidebar going
 * forward, toward it going back) while the next page is requested. If it is not ready when the
 * old page is gone, the shell shows its loader; once the new page has rendered and its data has
 * arrived, the page fades in. The shell drives the visuals from `phase` (see globals.css).
 */

export type NavDirection = "forward" | "back";
export type NavPhase = "idle" | "leaving" | "loading" | "entering";

interface NavState {
  phase: NavPhase;
  direction: NavDirection;
  /** The page being left; the next page is ready once the shell shows a different one. */
  fromPath: string;
  /** Where the user is going (without the locale), so navigation can highlight it at once. */
  toPath: string | null;
}

const LEAVE_MS = 150;
const ENTER_MS = 240;

let state: NavState = { phase: "idle", direction: "forward", fromPath: "", toPath: null };
let committedPath = "";
let leaveTimer: number | undefined;
let enterTimer: number | undefined;
const listeners = new Set<() => void>();

function set(patch: Partial<NavState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export const subscribeNav = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const navSnapshot = () => state;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Begin a page change: animate the old page out, then run `go` (the actual navigation). */
export function startNavigation(direction: NavDirection, go: () => void, toPath: string | null = null): void {
  window.clearTimeout(leaveTimer);
  window.clearTimeout(enterTimer);
  document.documentElement.dataset.nav = direction;
  set({ phase: "leaving", direction, fromPath: committedPath, toPath });
  leaveTimer = window.setTimeout(
    () => {
      set({ phase: "loading" });
      go();
    },
    reducedMotion() ? 0 : LEAVE_MS,
  );
}

/** The shell reports each page it shows, so a navigation knows when its new page is up. */
export function pageCommitted(path: string): void {
  committedPath = path;
}

/** The new page has rendered and loaded its data: fade it in. */
export function pageReady(): void {
  if (state.phase !== "loading") return;
  set({ phase: "entering", toPath: null });
  enterTimer = window.setTimeout(() => set({ phase: "idle" }), ENTER_MS);
}

// ---- direction of browser back/forward --------------------------------------------------

const STACK_KEY = "paypex.nav-stack";

interface NavStack {
  urls: string[];
  index: number;
}

function readStack(): NavStack {
  try {
    const raw = window.sessionStorage.getItem(STACK_KEY);
    if (raw) return JSON.parse(raw) as NavStack;
  } catch {
    // storage unavailable: start a fresh stack
  }
  return { urls: [], index: -1 };
}

function writeStack(stack: NavStack): void {
  try {
    window.sessionStorage.setItem(STACK_KEY, JSON.stringify(stack));
  } catch {
    // storage unavailable: directions fall back to "back"
  }
}

/** Record that `url` is now showing after a forward navigation. */
export function recordVisit(url: string): void {
  const stack = readStack();
  if (stack.urls[stack.index] === url) return;
  const urls = [...stack.urls.slice(0, stack.index + 1), url].slice(-100);
  writeStack({ urls, index: urls.length - 1 });
}

/** Work out whether a history jump to `url` went back or forward, and remember the move. */
function historyDirection(url: string): NavDirection {
  const stack = readStack();
  if (stack.urls[stack.index + 1] === url) {
    writeStack({ ...stack, index: stack.index + 1 });
    return "forward";
  }
  const back = stack.urls.lastIndexOf(url, Math.max(stack.index - 1, 0));
  writeStack({ ...stack, index: back >= 0 ? back : stack.index });
  return "back";
}

let replaying = false;

/**
 * Browser back/forward. Next.js swaps the page as soon as it sees `popstate`, so the event is
 * held back here (this listener runs first, in the capture phase) until the old page has left,
 * then replayed for Next.js.
 */
export function handlePopState(event: PopStateEvent, url: string): void {
  if (replaying) return;
  event.stopImmediatePropagation();
  const eventState: unknown = event.state;
  startNavigation(historyDirection(url), () => {
    replaying = true;
    try {
      window.dispatchEvent(new PopStateEvent("popstate", { state: eventState }));
    } finally {
      replaying = false;
    }
  });
}
