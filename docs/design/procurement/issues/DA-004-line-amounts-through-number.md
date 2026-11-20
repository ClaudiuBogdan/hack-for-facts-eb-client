# DA-004: Exact line amounts go through `Number`

**Status:** open · Filed 2026-11-18 (DA-001 item 2) · **Priority:** P3. Not a leak.

- **Where:** `src/features/procurement/lib/direct-purchase-release.ts` (`numberOf` on the item's decimal strings)
  and `src/features/procurement/lib/direct-purchase-value-text.ts` (`amountText`, at most six decimals).
- **Effect:** a line amount written with more than six decimals, or beyond double precision, is shown rounded.
  The purchase's own reported, counted and corrected values are unaffected.
- **Fix:** carry the decimal string to the formatter and format from it.
