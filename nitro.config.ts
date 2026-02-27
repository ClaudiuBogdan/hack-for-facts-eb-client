import { defineNitroConfig } from "nitro/config";

const shortPublicPageCache = {
  maxAge: 300,
  swr: true,
  staleMaxAge: 86400,
  varies: ["cookie"],
} as const;

const longPublicPageCache = {
  maxAge: 3600,
  swr: true,
  staleMaxAge: 86400,
  varies: ["cookie"],
} as const;

export default defineNitroConfig({
  handlers: [
    {
      route: "/entities/:cui/share-image.png",
      handler: "./src/server/handlers/entity-share-image.ts",
      method: "get",
    },
  ],
  routeRules: {
    // IMPORTANT: Only cache routes that are truly public and deterministic.
    // If a route starts rendering auth/session/user-sensitive SSR content,
    // set that route to `cache: false` and return `Cache-Control: no-store`.
    // Nitro cached handler keys include pathname + query string by default,
    // so URL search state (currency/lang/filter params) is cache-keyed.
    "/": {
      cache: {
        maxAge: 3600,
        swr: true,
        staleMaxAge: 604800,
        varies: ["cookie"],
      },
    },
    // Keep Nitro in passthrough mode for binary image bodies.
    // Cache-Control is set by the handler for CDN/browser caching.
    "/entities/**/share-image.png": { cache: false },
    "/entities/**": { cache: shortPublicPageCache },
    "/entity-analytics": { cache: shortPublicPageCache },
    "/map": {
      cache: {
        maxAge: 300,
        swr: true,
        staleMaxAge: 3600,
        varies: ["cookie"],
      },
    },
    "/budget-explorer": { cache: longPublicPageCache },

    // Never cache personalized or mutable server endpoints.
    "/api": { cache: false },
    "/api/**": { cache: false },
    "/graphql": { cache: false },
    "/graphql/**": { cache: false },
    "/healthz": { cache: false },
    "/settings/**": { cache: false },
    "/alerts/**": { cache: false },
    "/unsubscribe/**": { cache: false },
  },
});
