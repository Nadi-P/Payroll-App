"use client";

import { createNavigation } from "next-intl/navigation";
import { useLocale } from "next-intl";
import { useMemo, type ComponentProps, type MouseEvent } from "react";
import { startNavigation, type NavDirection } from "@/lib/pageTransition";
import { routing } from "./routing";

const nav = createNavigation(routing);

export const { redirect, usePathname } = nav;

type PushArgs = Parameters<ReturnType<typeof nav.useRouter>["push"]>;

/** The locale-aware router; `push` animates the page change at once (see lib/pageTransition). */
export function useRouter() {
  const router = nav.useRouter();
  const locale = useLocale();
  return useMemo(
    () => ({
      ...router,
      push: (href: PushArgs[0], options?: PushArgs[1], direction: NavDirection = "forward") => {
        const target = typeof href === "string" ? `/${locale}${href === "/" ? "" : href}` : null;
        if (target === null) return router.push(href, options);
        if (target === window.location.pathname + window.location.search) return;
        // Same page with a different query: no page change to animate.
        if (target.split("?")[0] === window.location.pathname) return router.push(href, options);
        router.prefetch(href); // start loading now; the old page animates out meanwhile
        startNavigation(direction, () => router.push(href, options), target.slice(locale.length + 1).split("?")[0] || "/");
      },
    }),
    [router, locale],
  );
}

type LinkProps = ComponentProps<typeof nav.Link> & {
  /** "back" for links that return up the hierarchy, like breadcrumbs. */
  direction?: NavDirection;
};

/** The locale-aware link; plain left clicks navigate through the animated router. */
export function Link({ direction = "forward", onClick, ...props }: LinkProps) {
  const router = useRouter();
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    const plain = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
    if (e.defaultPrevented || !plain || props.target || typeof props.href !== "string") return;
    e.preventDefault();
    router.push(props.href, { scroll: props.scroll }, direction);
  };
  return <nav.Link {...props} onClick={handleClick} />;
}
