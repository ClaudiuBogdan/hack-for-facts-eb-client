# Feature: BVB Market & Reports tab

> Next-2. Tab `?tab=bursa` on `/intreprinderi-publice/$cui`. Lane: BVB market
> listings + reports — **built but deploy-gated**. Shown only for the ~19 listed
> SOEs; hidden entirely for non-listed enterprises. Read with
> `enterprise-profile.md`, `source-lineage-verify.md`, and `../design.md`.

## Feature owner profile

Frontend feature implementation subagent (React 19 + TypeScript + shadcn/ui +
Lingui). Must handle PDF `download_status` honesty and the listed/non-listed
gating.

## Summary

For a listed state-owned enterprise, this tab consolidates BVB market data (ticker,
ISIN, market segment, instrument type, and market indicators: market cap, P/E,
P/BV, EPS, dividend/yield) and a chronological list of report PDFs (annual,
half-year, financial statements, current reports) with download links and an
honest per-report `download_status`. The tab is hidden for non-listed enterprises
and gated until the BVB lane deploys.

## Facts, decisions, assumptions

- Fact (UX §5 Lane 5, §13 Next-2): 19 tickered SOEs; ticker→CUI seed already in
  raw AMEPIP `ticker_symbol`. Built, deploy-gated.
- Fact (UX §5): `market_listings` columns: `cui, ticker, isin, market_segment,
  instrument_type, company_name, bvb_status, total_shares, indicators (jsonb:
  market cap, P/E, P/BV, EPS, dividend/yield), detail_source_url (m.bvb.ro issuer
  page)`. `market_reports` columns: `cui, ticker, report_title, report_url,
  report_date, file_name, object_id, content_sha256, byte_size, download_status
  ('listed'|'downloaded'|'deferred'|'failed'|'too_large')`. Latest
  annual/financial set scoped; no full historical backfill in v1.
- Fact (UX §15): `bvb.ro` is crawl-blocked; `m.bvb.ro` works. Report PDFs may be
  `deferred`/`failed`/`too_large` — status must be shown honestly. Per-symbol
  Current-Reports HTML shape not fully verified — the report set may be partial
  initially.
- Fact (UX §15): SNP (OMV Petrom), EL (Electrica), FP (Fondul Proprietatea) are
  liquid BVB symbols but NOT AMEPIP SOEs — they are out of scope and must never
  appear here. (This tab keys off the enterprise's own `ticker_symbol`, so it
  cannot surface them, but the copy must not imply "all BVB symbols".)
- Decision: Tab visibility — hidden when `identity.tickerSymbol == null`; gated
  (`LaneStatusPanel`) when the enterprise is listed but the lane is not live;
  live otherwise.
- Decision: Market indicators (P/E, P/BV, EPS, dividend yield, market cap) are BVB
  facts, clearly labelled `Sursă: BVB`, and kept separate from AMEPIP KPIs — never
  charted together with AMEPIP ratios in the MVP (overlay is UX §12 advanced).
- Assumption: `indicators` jsonb keys are stable enough to render a fixed label
  set; unknown keys render generically as `{key}: {value}` rather than being
  dropped, so nothing is silently hidden.

## Route and URL state

- Fact: Panel of `/intreprinderi-publice/$cui`; addressed by `?tab=bursa`. No
  extra search params (report list is chronological; no server-side paging needed
  for the scoped v1 set).

## Data contract and mock states

`fetchMarketProfile(cui)` → `MarketProfile | null` (mock↔live by `soe-bvb-market`).

```ts
type MarketProfile = {
  cui: string
  ticker: string
  isin: string | null
  marketSegment: string | null
  instrumentType: string | null
  bvbStatus: string | null
  totalShares: number | null
  indicators: ReadonlyArray<{ key: string; label: string; value: string | number | null; unit: string | null }>
  detailSourceUrl: string | null       // m.bvb.ro issuer page
  reports: readonly MarketReport[]
  lineage: SourceLineage               // BVB
}

type MarketReport = {
  reportTitle: string
  reportType: string | null            // annual/half-year/financial/current (best-effort)
  reportDate: string | null            // ISO; may be null
  reportUrl: string | null             // m.bvb.ro pdf
  fileName: string | null
  byteSize: number | null
  contentSha256: string | null
  downloadStatus: 'listed' | 'downloaded' | 'deferred' | 'failed' | 'too_large'
}
```

### States

- **Hidden**: non-listed enterprise → tab not rendered at all.
- **Gated**: listed enterprise, lane not live → `LaneStatusPanel` ("Date de piață
  BVB și rapoarte — în curând").
- **Live, full**: market card + report list.
- **Live, partial reports**: market card renders; report list shows a note
  "Set de rapoarte parțial (v1)" when the source set is known-incomplete.
- **Empty reports**: market card renders; report section shows `EmptyState` "Nu
  există rapoarte disponibile momentan".
- **Loading**: market card + report list skeletons.
- **Error**: inline `Alert` + retry.
- **Stale**: BVB snapshot note in lineage badge (market indicators are point-in-time
  — show the as-of date prominently so users don't read them as live quotes).

## UI structure

Within the tab panel:

1. **MarketCard** (framed record), labelled `Sursă: BVB`:
   - `ticker` (prominent) + `ISIN {isin}` + market segment + instrument type +
     `bvb_status` chip.
   - Indicator grid: market cap, P/E, P/BV, EPS, dividend/yield, total shares —
     each with a value + unit + a one-line plain definition tooltip. An explicit
     "Date de piață, la data {snapshot}" caption so they are not read as live.
   - A `Button`/link "Pagina emitentului la BVB ↗" → `detail_source_url`.
   - `SourceLineageBadge` (BVB).
2. **Reports list** (`divide-y`): each row — `report_title` + `reportType` chip +
   `report_date` + file size + a `DownloadStatusBadge`:
   - `downloaded`/`listed`: "Descarcă PDF ↗" link to `report_url` (new tab).
   - `deferred`: "Indisponibil momentan" (muted) + retry-later note.
   - `failed`: "Descărcare eșuată" + link to the source page.
   - `too_large`: "Fișier prea mare — deschide la sursă ↗".
   - Each report row carries row-level lineage (`content_sha256`, `object_id`).
3. **Note**: a one-line reminder that market data and AMEPIP KPIs are different
   sources and not directly comparable (Pattern C/D).

## Component reuse and proposed new components

- Reuse: `card`, `Badge`, `Tooltip`, `Button`, `alert`, `skeleton`,
  `empty-state`, `divide-y` list pattern; `SourceLineageBadge`, `DataStatusBadge`,
  `LaneStatusPanel`.
- New: `MarketCard`, `MarketIndicatorGrid`, `MarketReportList`,
  `DownloadStatusBadge`, `lib/market-indicators.ts` (key→label/unit/definition).

## Interactions

- Click a report download → opens `report_url` in a new tab
  (`rel="noopener noreferrer"`); blocked/failed statuses do not present a dead
  download link (they link to the issuer page instead).
- Click "Pagina emitentului" → `detail_source_url` (m.bvb.ro).
- Hover an indicator → plain-language definition tooltip (unit also printed).
- `SourceLineageBadge` → provenance drawer.

## Loading, empty, error, partial, stale states

See Data contract → States. Invariant: a non-`downloaded` report never shows a
dead PDF link; market indicators always show an as-of date so they are not mistaken
for live quotes.

## Accessibility and i18n

- Indicator grid is a semantic definition list / labelled cells; tooltips are not
  the only carrier of the unit.
- Download status pairs a text label with the badge color; external links have
  `aria-label` + sr-only "se deschide într-o pagină nouă".
- All copy Lingui; expand BVB, ISIN, P/E, P/BV, EPS on first use; numbers/money via
  `Intl.NumberFormat('ro-RO')`.

## Privacy, provenance, and source-citation behavior

- `Sursă: BVB` label throughout; kept separate from AMEPIP facts (Pattern C).
- Per-report row-level lineage (`content_sha256`) in the provenance drawer.
- No person-level data.

## Acceptance checklist

- [ ] Tab is hidden for non-listed enterprises; gated (panel + badge) when listed
      but the lane is not live; live otherwise.
- [ ] Market card shows ticker, ISIN, segment, and the indicator grid with units +
      an explicit as-of date.
- [ ] SNP/EL/FP cannot and do not appear; copy never implies all BVB symbols are
      SOEs.
- [ ] Reports list shows date, type, size, and an honest `download_status`; only
      `downloaded`/`listed` reports expose a direct PDF link.
- [ ] Market data is visibly separated from AMEPIP KPIs (no merged chart in MVP).
- [ ] BVB lineage badge + issuer-page link work; Lingui-wrapped; `yarn typecheck`
      clean.

## Non-goals

- No BVB-vs-AMEPIP overlay chart (UX §12 advanced).
- No full historical report backfill (v1 is the latest scoped set — Fact UX §5).
- No live price quotes (data is point-in-time snapshots).

## Open questions (blockers only)

- **Blocker**: prod serving contract for the BVB lane + confirmation of the
  per-symbol report-set completeness (Fact UX §15: Current-Reports HTML shape not
  fully verified). Until resolved, the tab ships gated/mock and labels partial
  report sets honestly.
