# DA-001: Direct acquisitions release 1, client follow-ups left after the third review

Status: open · Filed 2026-11-18 · Branch `feat/procurement-da-release-20261118` · Accepted as follow-ups by root
under the review round cap (after the third review, only a D6 leak blocks the release). None of these is a leak.

## Summary

Three non-leak findings from the second independent review (gpt-6.2-sol, xhigh) were left open when release 1's
client shipped. Each is described with where it lives and a suggested fix.

## 1. A release purchase is kept under its legacy key until the page mounts

- **Where:** `src/features/procurement/hooks/use-procurement-direct-purchase.ts` (the query reads
  `fetchPurchaseForPage` under the id it was asked for) and
  `src/features/procurement/components/direct-purchase/procurement-direct-purchase-page.tsx` (`useReleaseUrl` copies
  the purchase to the release id's key, replaces the URL, then removes the legacy key).
- **Effect:** a prefetch of a legacy link that never mounts the page leaves the release purchase under the legacy
  id. It is the same purchase, and the app-shell disclosure watch resets it on a new publication, so nothing stale
  or withheld outlives a publish. The cache just holds it under a non-canonical key.
- **Fix:** have the query return an alias result (`{ releaseId }`) for a legacy id that resolves to the release,
  and read or seed the purchase only under its release id. The redirect test should then drive a real router
  rather than a stubbed `navigate`.

## 2. Exact line amounts go through `Number`

- **Where:** `src/features/procurement/lib/direct-purchase-release.ts` (`numberOf` on the item's decimal strings)
  and `src/features/procurement/lib/direct-purchase-value-text.ts` (`amountText`, at most six decimals).
- **Effect:** a line amount written with more than six decimals, or beyond double precision, is shown rounded.
  The purchase's own reported, counted and corrected values are unaffected.
- **Fix:** carry the decimal string to the formatter and format from it.

## 3. Two refused figures are left out rather than said in the D6-only window

- **Where:**
  - the front door's „Firme care au vândut direct statului" tile
    (`src/features/procurement/components/home/procurement-home-page.tsx`, the `suppliers` fact);
  - the purchase context's „firma e al N-lea furnizor" sentence
    (`src/features/procurement/components/direct-purchase/direct-purchase-context.tsx`, `PairYear`).
- **Effect:** with D6 enforced and the release off, both are omitted. The band beside each says the direct
  purchases' firms are unavailable, so the page is not blank.
- **Fix:** carry an explicit `unavailable` state to each, as the analytics tiles do („indisponibil").

## Third review (18 November 2026)

The third review's non-leak findings match items 1–3 above. Its point that the purchase's own row among the
neighbours took „lei" when uncounted is fixed: the row carries its value's basis, as the neighbours' do. Items 1–3
remain open as written.

## Release note (visible change, not a defect)

Analytics no longer offers title search or a firm's place for direct purchases: „Achizițiile directe nu mai pot fi
căutate după titlu în analize: titlurile lor sunt ascunse până la verificare."
