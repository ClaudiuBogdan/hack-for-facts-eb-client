# Feature: Referendum Results Page

> Self-sufficient spec. Foundation: `docs/design/README.md`. Domain:
> `../design.md` (data contract §6). UX: `docs/ux-research/elections.md`
> §10.7, §13.6.

## Feature owner profile

Frontend feature engineer (React 19, TanStack Router, shadcn/ui, Lingui) with
maps comfort (choropleth via `src/components/maps`). Self-contained surface.

## Summary

A dedicated page for each referendum contest: the referendum question/options,
option-level results (da / nu / nule) by geography, and turnout — with a
county/diaspora choropleth and the same provenance contract as the contest
explorer. Distinct from the candidate/competitor explorer because referendums
have options, not competitors.

## Facts / Decisions / Assumptions

- **Fact:** `referendum_options`: `option_key, source_label, normalized_label`
  per contest. Referendum archives parsed: 2003, 2007 (May/Nov), 2012 (June),
  2018, 2019.
- **Fact:** Results come from `result_rows` at referendum contests across
  `reporting_units`; turnout metrics from the same store.
- **Decision:** Referendum contests route here (`/alegeri/referendum/$contestKey`)
  from landing/hub/search, never to the competitor explorer.
- **Decision:** Show the **referendum question** prominently when available; if
  the source did not publish a clean question string, show the option labels and
  a "întrebarea exactă nu este disponibilă în sursă" note.
- **Decision:** Validity/quorum is a known sensitive topic; **do not assert**
  whether a referendum was validated. Show turnout and option results as
  published; if a quorum threshold is not a source-published metric, omit any
  pass/fail verdict (Assumption: quorum is not reliably modeled).
- **Assumption:** Option labels are source-verbatim; `normalized_label` (DA/NU)
  used for consistent coloring only.

## Route and URL state

- Route: `src/routes/alegeri/referendum.$contestKey.tsx`.

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `geo` | string | contest scope | active reporting unit |
| `scope` | enum | contest scope | `national,county,diaspora,siruta,polling_station` |
| `view` | enum | `lista` | `harta \| lista \| tabel` |
| `metric` | enum | `option_share` | map coloring: `option_share \| turnout` |
| `option` | string | leading | option selected for map coloring |
| `expert` | `0\|1` | `0` | polling-station grain |
| `tab` | enum | `rezultate` | `rezultate \| date` |

## Data contract and mock states

Consumes via
`fetchReferendum({ contestKey, geo, scope }): Promise<{ contest: ContestSummary;
election: ElectionSummary; question: string | null; unit: ReportingUnitRef;
children: ReportingUnitRef[]; options: ReferendumOptionResult[];
turnout: TurnoutMetrics; coverage: CoverageMeta }>`.

`ReferendumOptionResult` per domain §6 (`optionKey, sourceLabel,
normalizedLabel, votes, votePercent, provenance`).

Mock fixtures: `referendum-{key}.ts`. Provide: a 2-option (DA/NU) referendum
with national + county + diaspora; one with `question=null`; one geography with
missing turnout; an inaccessible source row.

States: full results; question-missing; turnout-missing; drilled to commune;
diaspora view.

## UI structure

1. `PageHeader` — H1 = referendum name; family badge `Referendum`, date,
   finality; breadcrumb `Alegeri / {election} / Referendum`. Boundary chip
   `Rezultate alegeri` (not parliament).
2. `CoverageRibbon`.
3. **Întrebare** band — the referendum question (or the missing-question note).
4. **Rezultat** band — `ReferendumOptionResults`: option cards (DA / NU / nule),
   each with votes + % + provenance chip; plain-language line "Au votat «DA» X%
   dintre voturile valide." `TurnoutSummary` (valid/invalid/total). **No
   pass/fail verdict.**
5. **Geografie** — `MapListSync` choropleth colored by selected `option` share
   or turnout, with county/diaspora units; synced list; drill to commune;
   expert polling stations.
6. **Date / sursă** (`tab=date`) — per-geography option table + provenance +
   current-view export + `ShareFilteredView`.
7. `RelatedLinksRail` — election hub, same-geography `/alegeri/loc/...`,
   `/primarie`.

## Component reuse and new components

- Reuse: `Tabs`, `Table`, `Badge`, `Select`, `Tooltip`, `Skeleton`, maps,
  charts.
- Shared: `CoverageRibbon`, `DataStatusBadge`, `MapListSync`, `EvidenceLink`,
  `SourceProvenanceDrawer`, `TurnoutSummary` (shared with contest explorer),
  `ShareFilteredView`, `RelatedLinksRail`.
- New (module): `ReferendumOptionResults`, `ReferendumQuestionBand`.

## Interactions

- Drill via map/list updates `geo`/`scope`; breadcrumb back.
- `option`/`metric` select recolors map.
- View toggle; sort table; provenance chips open drawer; expert reveals
  polling stations.

## Loading / empty / error / partial / stale states

- **Loading:** option-card skeletons, map loading state, list skeleton.
- **Empty:** no results at chosen geography → `EmptyState`, return to parent.
- **Error:** retry, URL preserved; invalid key → not-found.
- **Partial:** missing turnout/options → `—` + tooltip; question-missing note.
- **Inaccessible:** evidenced-gap badge, not zeros.
- **Stale:** `FreshnessBadge`.

## Accessibility and i18n

- Option cards convey result via text + %, not color alone; map has text summary
  and tabular fallback.
- Tables semantic; Lingui copy; `ro-RO` formatting; expand "voturi nule",
  "prezență", diaspora terms.

## Privacy, provenance, source citation

- No verdict on validity/quorum unless source-published (it is not assumed).
- Every figure → provenance drawer; inaccessible sources evidenced.
- Boundary chip keeps this as election results, not parliament.

## Acceptance checklist

- [ ] Referendum contests route here, not to the competitor explorer.
- [ ] Question shown or honest missing-question note.
- [ ] Option results (da/nu/nule) + turnout, no pass/fail verdict.
- [ ] Choropleth by option/turnout with drill-down and synced list.
- [ ] Provenance per figure; inaccessible sources evidenced.
- [ ] `yarn typecheck` clean; Lingui copy.

## Non-goals

- Quorum/validity adjudication.
- Cross-referendum comparison (could reuse `election-swing-comparison.md`).
- Competitor/candidate framing.

## Open questions (blockers only)

None for mock-first. Whether quorum is a reliable source metric is a data
question, designed around by omitting any verdict — not a blocker.
