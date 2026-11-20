# DA-003: A release purchase is kept under its legacy key until the page mounts

**Status:** open · Filed 2026-11-18 (DA-001 item 1) · **Priority:** P3. Not a leak.

- **Where:** `src/features/procurement/hooks/use-procurement-direct-purchase.ts` (the query reads
  `fetchPurchaseForPage` under the id it was asked for) and
  `src/features/procurement/components/direct-purchase/procurement-direct-purchase-page.tsx` (`useReleaseUrl`
  replaces the URL, then removes the legacy key; since 19 November it no longer copies the purchase to the release
  id's key, which outlived the page with the default lifetime: the release page reads its own).
- **Effect:** a prefetch of a legacy link that never mounts the page leaves the release purchase under the legacy
  id until the router's next cleanup (the query is dropped 30 s after nothing shows it: `DA_QUERY_CACHE`). It is the
  same purchase, and the app-shell disclosure watch purges it on a new publication.
- **Fix:** have the query return an alias result (`{ releaseId }`) for a legacy id that resolves to the release,
  and read or seed the purchase only under its release id. The redirect test should then drive a real router
  rather than a stubbed `navigate`.
