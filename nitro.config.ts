import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  routeRules: {
    // No page has a Nitro route cache. A cached render never saw the reader's
    // cookies (ocache strips the headers named in `varies` from the request it
    // renders), so the language, theme, currency and dismissed notices fell back
    // to their defaults, and each visitor's cookies kept a copy of the page
    // (docs/issues/CACHE-001-route-cache-renders-without-cookies.md). Pages
    // render per request; scripts/check-built-cookie-render.mjs pins it.
    //
    // Meant for the share images: binary bodies, passed through, with the
    // Cache-Control the handler sets. The matcher ignores what follows `**`, so
    // the rule matches every path under /entities/, the pages included.
    "/entities/**/share-image.png": { cache: false },
    "/entity-analytics": { cache: false },
    "/map": { cache: false },
    // Boundary files are published under a new dated name, never over an old
    // one (`src/hooks/useGeoJson.ts`), so a copy never goes stale.
    "/geojson/**": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
    // The map's label glyphs, in a dated folder (`src/components/maps/map-glyphs.ts`).
    "/map-glyphs/**": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
    // A withdrawn companies analytics release must stop reaching readers at the
    // next request: every render reads the API afresh, and none is ever kept.
    "/companies/analytics": { cache: false },

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
