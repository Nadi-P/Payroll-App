"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import {
  handlePopState,
  navSnapshot,
  pageCommitted,
  pageReady,
  recordVisit,
  subscribeNav,
} from "@/lib/pageTransition";

const here = () => window.location.pathname + window.location.search;

/** Longest the loader waits for a page's data before showing the page anyway. */
const MAX_LOADING_MS = 10_000;

/**
 * Connects the shell to page transitions: reports each rendered page, decides when a new page
 * is fully loaded (rendered, and no data requests left), and animates browser back/forward.
 */
export function usePageTransitions(pathname: string) {
  const nav = useSyncExternalStore(subscribeNav, navSnapshot, navSnapshot);
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    pageCommitted(pathname);
  }, [pathname]);

  useEffect(() => {
    recordVisit(here());
  }, [pathname]);

  useEffect(() => {
    if (nav.phase !== "loading" || pathname === nav.fromPath) return;
    // The new page is up; its data requests start in its own effects, which have run by now.
    let timer: number | undefined;
    const check = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (queryClient.isFetching() === 0) pageReady();
      }, 30);
    };
    const unsubscribe = queryClient.getQueryCache().subscribe(check);
    check();
    const giveUp = window.setTimeout(pageReady, MAX_LOADING_MS);
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
      window.clearTimeout(giveUp);
    };
  }, [nav.phase, nav.fromPath, pathname, queryClient]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => handlePopState(e, here());
    window.addEventListener("popstate", onPop, { capture: true });
    return () => window.removeEventListener("popstate", onPop, { capture: true });
  }, []);

  return { phase: nav.phase, loading: nav.phase === "loading", toPath: nav.toPath };
}
