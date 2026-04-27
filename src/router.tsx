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

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultErrorComponent: ({ error }) => <GlobalErrorPage error={error} />,
    parseSearch,
    stringifySearch,
    // Enable automatic scroll-to-top on navigation
    scrollRestoration: true,
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
