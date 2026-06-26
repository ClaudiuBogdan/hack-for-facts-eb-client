# Feature: Election-vs-Election Swing Comparison

> Self-sufficient spec. Foundation: `docs/design/README.md`. Domain:
> `../design.md` (data contract §6). UX: `docs/ux-research/elections.md`
> §4.2, §12.2, §13 high-value-next, §15.4 (heterogeneity caveat).

## Feature owner profile

Senior frontend feature engineer (React 19, TanStack Router, shadcn/ui, Lingui)
with **maps + comparative data-viz** depth. Handles diff computation at the UI
boundary and honest comparability caveats.

## Summary

Compare two comparable elections (same office/family) over the same geography to
show the **swing**: which competitors/areas moved, by how much, where turnout
shifted. Works as a `compare` mode layered onto the contest explorer and the
geography profile, plus an optional standalone `/alegeri/comparatie` entry. Uses
neutral language ("diferență", "concentrare", "necorelare"), never "fraud" or
wrongdoing.

## Facts / Decisions / Assumptions

- **Fact:** Cross-year comparisons rest on differently sourced/normalized
  metrics (1992 DBF → 2025 CSV); `source_metric_map` mapping status varies.
- **Fact:** Competitor labels drift (`competitor_party_links` empty), so
  "same party across elections" is approximate.
- **Decision:** Comparison is only offered between **same-office, same-family**
  contests (e.g. local mayor 2020 vs 2024 for the same SIRUTA; presidential tur 2
  2019 vs 2025 national). The UI prevents incoherent pairings.
- **Decision:** Competitor matching across the two elections is by
  `competitor_key` when identical, else **manual/best-effort by normalized
  label**, always shown as "potrivire aproximativă" — never silently merged.
  Unmatched competitors are listed as "doar în 20XX".
- **Decision:** A prominent comparability banner states source-family /
  mapping-status differences when the two elections differ in source format.
- **Decision:** Swing is computed at the UI boundary from two
  `ContestResults`/aggregates; no new heavy backend assumed beyond the pair
  fetch. Neutral wording only.
- **Assumption:** Pre-aggregated per-unit competitor totals exist for both
  elections; mock provides matched + unmatched competitors and a turnout shift.

## Route and URL state

- **Layered mode:** `compare=<otherContestKey>` (or `<otherElectionKey>`) on
  `/alegeri/contest/$contestKey` and `/alegeri/loc/$reportingUnitKey`.
- **Standalone:** `src/routes/alegeri/comparatie.tsx` (`/alegeri/comparatie`)
  with both sides as params.

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `a` | string | none | left contest/election key (standalone) |
| `b` | string | none | right contest/election key |
| `geo` | string | shared scope | reporting unit for both |
| `scope` | enum | shared | `national,county,siruta,diaspora` |
| `metric` | enum | `vote_share` | swing metric: `vote_share \| votes \| turnout` |
| `view` | enum | `tabel` | `tabel \| harta` |
| `sort` | enum | `swing_desc` | swing table sort |

## Data contract and mock states

Consumes via
`fetchSwing({ a, b, geo, scope, metric }): Promise<SwingResult>`:

```ts
interface SwingRow {
  readonly competitorKey: string | null   // null if unmatched
  readonly labelA: string | null          // source label in A
  readonly labelB: string | null
  readonly matchKind: 'exact' | 'approx' | 'unmatched_a' | 'unmatched_b'
  readonly valueA: number | null
  readonly valueB: number | null
  readonly delta: number | null           // B - A
  readonly provenanceA: SourcePointer | null
  readonly provenanceB: SourcePointer | null
}

interface SwingResult {
  readonly contestA: ContestSummary
  readonly contestB: ContestSummary
  readonly unit: ReportingUnitRef
  readonly rows: readonly SwingRow[]
  readonly turnoutA: TurnoutMetrics
  readonly turnoutB: TurnoutMetrics
  readonly comparability: {
    readonly sameSourceFamily: boolean
    readonly mappingDifferences: readonly string[]
    readonly note: string
  }
  readonly perUnitDelta: readonly { reportingUnitKey: string; delta: number | null }[]
  readonly coverage: CoverageMeta
}
```

Mock fixtures: `swing-{a}-{b}.ts`. Provide: same-office pair with exact +
approximate + unmatched competitors; a turnout shift; a cross-format pair (caveat
banner); a per-unit delta set for the map.

States: clean comparison; approximate matches; unmatched competitors;
cross-format caveat; missing metric in one side.

## UI structure

1. Comparison header — "{office} — {geography}: {yearA} vs {yearB}"; two finality
   badges; `Rezultate alegeri` boundary chip.
2. `CoverageRibbon` (merged for both) + **comparability banner**
   (`PrivacyBoundaryNotice` style) when `sameSourceFamily=false` or mapping
   differs.
3. **Pair selector** — two `Select`s (A, B) constrained to same office/family;
   geography selector shared; metric toggle.
4. **Swing table** (`view=tabel`) — `SwingTable`: competitor, label A, label B,
   match-kind chip ("exact" / "potrivire aproximativă" / "doar în 20XX"), value
   A, value B, Δ (signed, neutral color + arrow + text), provenance chips for
   both sides. Sort by Δ.
5. **Swing map** (`view=harta`) — `SwingMap`: choropleth of per-unit Δ for the
   selected competitor/metric (diverging scale + legend + text summary); click a
   unit to scope the table.
6. **Turnout shift** — compact `TurnoutSummary` A vs B with Δ.
7. `RelatedLinksRail` — both contests, the competitor profiles, the geography
   profile.

## Component reuse and new components

- Reuse: `Select`, `Tabs`, `Table`, `Badge`, `Tooltip`, `Skeleton`, maps,
  charts.
- Shared: `CoverageRibbon`, `DataStatusBadge`, `EvidenceLink`,
  `SourceProvenanceDrawer`, `PrivacyBoundaryNotice`, `MapListSync`,
  `TurnoutSummary`, `ShareFilteredView`, `RelatedLinksRail`.
- New (module): `SwingTable`, `SwingMap`, `PairSelector`,
  `ComparabilityBanner`.

## Interactions

- Pair selector enforces compatible pairings (disables incompatible options).
- Metric/geo/view changes update URL + recompute.
- Map unit click scopes the table to that unit.
- Match-kind chips explain matching; approximate matches link both competitor
  profiles.
- Provenance chips (per side) open the drawer.

## Loading / empty / error / partial / stale states

- **Loading:** selector ready immediately; table/map skeleton on fetch.
- **Empty:** no comparable counterpart, or no overlap at the geography →
  `EmptyState` "Nu există o alegere comparabilă pentru această selecție."
- **Error:** retry, URL preserved; invalid pair → normalized by route validation.
- **Partial:** metric missing in one side → Δ `—` + "indisponibil într-una din
  alegeri"; cross-format caveat banner.
- **Stale:** `FreshnessBadge` per side if dates differ.

## Accessibility and i18n

- Diverging map has a text summary + the swing table as tabular fallback.
- Δ direction conveyed by arrow + sign + text, not color alone.
- Match-kind and comparability conveyed in text.
- Lingui copy; `ro-RO` signed-number/percent formatting; neutral terms
  ("diferență", "concentrare", "necorelare"); expand source-family terms.

## Privacy, provenance, source citation

- Neutral, non-accusatory language; no fraud/wrongdoing framing.
- Cross-format and approximate-match caveats are explicit.
- Every value on both sides → provenance drawer.
- Competitor matching never silently merges labels.

## Acceptance checklist

- [ ] Only same-office/same-family pairings are allowed.
- [ ] Swing table shows exact/approx/unmatched matches with both-side
      provenance and signed Δ.
- [ ] Swing map renders per-unit Δ with diverging legend + text summary.
- [ ] Comparability/cross-format caveat shown when sources differ.
- [ ] Works as `compare` mode on contest + geography pages and standalone.
- [ ] Neutral language; no wrongdoing framing.
- [ ] `yarn typecheck` clean; Lingui copy.

## Non-goals

- Anomaly/fraud detection or scoring.
- Mandate-vs-vote-share deviation (advanced).
- Multi-election (>2) comparison.

## Open questions (blockers only)

None for mock-first. Robust competitor matching across elections improves once
`competitor_party_links` lands; until then approximate-match labeling is the
designed behavior, not a blocker.
