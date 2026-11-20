# DA-005: Two refused figures are left out rather than said in the D6-only window

**Status:** open · Filed 2026-11-18 (DA-001 item 3) · **Priority:** P3. Not a leak.

- **Where:**
  - the front door's „Firme care au vândut direct statului" tile
    (`src/features/procurement/components/home/procurement-home-page.tsx`, the `suppliers` fact);
  - the purchase context's „firma e al N-lea furnizor" sentence
    (`src/features/procurement/components/direct-purchase/direct-purchase-context.tsx`, `PairYear`).
- **Effect:** with D6 enforced and the release off, both are omitted. The band beside each says the direct
  purchases' firms are unavailable, so the page is not blank.
- **Fix:** carry an explicit `unavailable` state to each, as the analytics tiles do („indisponibil").
