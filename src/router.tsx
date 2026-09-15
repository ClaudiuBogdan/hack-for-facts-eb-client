import { createRouter, parseSearchWith, stringifySearchWith } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import GlobalErrorPage from "@/components/errors/GlobalErrorPage";
import { createQueryClient } from "@/lib/queryClient";
import { normalizeHrefSearch, normalizeSearchEncoding } from "@/lib/router-search";
import type { RouterContext } from "@/router-context";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = createQueryClient();
  // Normalize URL encoding to avoid SSR redirect loops caused by + vs %20.
  // Also handle double-encoded JSON search params used across routes.
  // See: https://tanstack.com/router/v1/docs/framework/react/guide/custom-search-param-serialization
  const searchParser = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      // Continue to URI-decoding fallback.
    }

    try {
      const normalized = value.replace(/\+/g, "%20");
      return JSON.parse(decodeURIComponent(normalized));
    } catch {
      throw new Error("Not JSON");
    }
  };

  const parseSearch = parseSearchWith(searchParser);
  const baseStringifySearch = stringifySearchWith(JSON.stringify, searchParser);
  const stringifySearch = (search: Record<string, unknown>) =>
    normalizeSearchEncoding(baseStringifySearch(search));

  // On a fresh navigation the SSR inline script (`tsr-scroll-restoration-v1`)
  // has already placed the page at parse time, before first paint, and the
  // router repeats that work on its first `onRendered` — which fires when
  // hydration commits, a second or more later on a heavy route. By then the
  // reader may have started scrolling, and the repeat takes their place away.
  // The initial load has no navigation to carry `resetScroll: false` and
  // `_scroll.next` has no public setter, so this predicate is the only seam.
  //
  // On a reload or a back/forward the same pass is a *correction*, not a
  // repeat: the inline script restores pre-paint against a document that is
  // still short, so a deep position clamps, and the router's pass is what puts
  // it right once the real height is in. Measured on `/entities/$cui`, which
  // grows ~1500px after first paint: skipping it there cost the reader 1800px
  // of scroll. So only `navigate` is treated as redundant, and anything else —
  // including a missing navigation entry — keeps the upstream behaviour.
  //
  // Position, not render count, decides the `navigate` case: returning false
  // skips the router's whole scroll pass, hash `scrollIntoView` included, so we
  // only skip once something has already placed the page.
  //
  // Delete this once TanStack guards the hydration render itself; router-core
  // 1.171.x and `main` both still reset unconditionally. See #7815 / #7956.
  let initialRenderSettled = false;
  const scrollRestoration = () => {
    if (typeof window === "undefined") return true;
    if (initialRenderSettled) return true;
    initialRenderSettled = true;
    const [entry] = performance.getEntriesByType("navigation");
    if ((entry as PerformanceNavigationTiming | undefined)?.type !== "navigate") {
      return true;
    }
    return window.scrollY === 0 && window.scrollX === 0;
  };

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultErrorComponent: ({ error }) => <GlobalErrorPage error={error} />,
    parseSearch,
    stringifySearch,
    // TanStack's defaults (1000ms / 500ms) meant a route's `pendingComponent`
    // effectively never rendered: `/entities/$cui` declares `ViewLoading` yet
    // its ~1s blocking loader finished just under the threshold, so a click
    // froze the previous page with no feedback at all. Show the skeleton once
    // a navigation is visibly slow, and hold it long enough not to flicker.
    // Loader-less routes still transition instantly and never see this.
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
    // Enable automatic scroll-to-top on navigation
    scrollRestoration,
    // Use smooth scrolling for better UX
    scrollRestorationBehavior: "instant",
    // Scroll both window and main content area
    scrollToTopSelectors: ["window", '[role="main"]'],
  });

  const baseParseLocation = router.parseLocation.bind(router);
  router.parseLocation = (location, previousLocation) => {
    const parsed = baseParseLocation(location, previousLocation);
    if (!parsed.publicHref) return parsed;
    const normalizedPublicHref = normalizeHrefSearch(parsed.publicHref);
    if (normalizedPublicHref === parsed.publicHref) return parsed;
    return { ...parsed, publicHref: normalizedPublicHref };
  };

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
    context: RouterContext;
  }
}
