# Elections analytics page (change 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/alegeri/analize`, the national budget's analysis head over the five views and all 25 tabs, the Mandate view drawn from the dev API.

**Architecture:** A new `src/features/elections/analytics/` unit (lib, api, hooks, components), promoted from the prototype `src/development/prototypes/elections/pagini/{data,parts,tabs,analize}.ts(x)`. The route reads the local 2024 mandates on the server under the elections pages' 1 s deadline and seeds the page's query with the reduced figures (never the raw 780 KB response); the browser reads again only when that read failed. URL keys `tip`, `dupa`, `judet`, every key returned (router merge trap).

**Tech Stack:** TanStack Start/Router/Query, Zod, Lingui, Tailwind, Vitest, Playwright integration.

**Spec:** `docs/design/elections/pages.md` (owner's decisions, 2026-11-28).

## Global Constraints

- Party level only. An independent's label and key never leave the reducer: the line is „Independenți".
- Missing is never zero: no row → `null` → a dashed panel. National totals say „fără București" from `MISSING_SCOPE:county:B`.
- Allocation phases never summed: county councils show `man_1` and `man_2` side by side.
- A line with a SUSPECT member carries „defect cunoscut".
- Caveats behind one amber marker (`NotesMarker`); sentence case; no mono eyebrows.
- Way home „Acasă / Alegeri / Analize"; page root `[font-feature-settings:'ss03']`.
- No source links: the sources line names the official results and the publication's `activatedAt`.
- Lingui: tell root before the extract; own ids only; ro and en filled by hand.
- Conventional commits, subject ≤ 50 chars, no AI trailers, explicit paths.

## Review Focus

- `?tip=nimic&judet=XX&dupa=nimic` → the Mandate view, the whole country, no section scrolled; the URL keeps no stale value (integration).
- `?judet=B` → mayors and councillors dashed („nu e încă în date"), the county council dashed, never 0 (unit on the scoping + integration).
- The mandates read fails on the server → the page renders, the browser reads it again; fails in the browser → the retry panel, no zeros (route + page tests).
- A tie for the most mayoralties in a county → the tile is dashed and named „egalitate", never given to one party (charts test).
- A view other than Mandate → its tabs listed in the jump row, each panel saying „În curând" or „Încă nu e în date" with its note, no figures band (page test).

---

### Task 1: The line model and the mandates reducer

**Files:**
- Create: `src/features/elections/analytics/lib/lines.ts`, `src/features/elections/analytics/lib/mandates.ts`
- Create: `src/schemas/elections-results.ts`
- Test: `src/features/elections/analytics/lib/lines.test.ts`, `src/features/elections/analytics/lib/mandates.test.ts`

**Interfaces — Produces:**
- `type Line = 'psd' | 'pnl' | 'pdl' | 'usr' | 'udmr' | 'aur' | 'pmp' | 'alde' | 'pro' | 'prm' | 'adu' | 'psdpnl' | 'ind' | 'other'`
- `lineOfCompetitor(c: { kind; actorKey: string | null; label }): Line`, `normaliseLabel(s): string`
- `type LineCount = { line: Line; value: number; suspect: boolean }`
- `foldLines(tallies: readonly ElectionResultTally[], measure: string, phase: ElectionAllocationPhase): readonly LineCount[] | null`, `ordered`, `total`
- `lineStyle(line): { label; fill; swatch }`, `lineLabel(line): string`, `onSwatch(line)`
- `type LocalMandates` (as in the prototype: `mayors`, `councillors`, `countyCouncil {first, second}`, `counties: CountyMandates[]`, `missing`, `suspect`), `localMandatesOf(raw: MandatesResponse): LocalMandates`, `countyCouncilOf(raw): PhasePair`
- Schemas: `electionResultTallySchema`, `mandatesResponseSchema`, `countyCouncilResponseSchema`

- [ ] Tests: alliances by normalised label (`Alianța Dreapta Unită USR PMP Forța Dreptei` → `adu`); `independent`/`independents_bucket` → `ind` whatever the key; unknown actor → `other`; `foldLines` sums per line, marks SUSPECT, returns `null` for no rows, drops zero lines, orders by size with `ind` then `other` last; `localMandatesOf` reads `MISSING_SCOPE:county:B` into `missing: ['B']`, keeps a county without tallies as `null`, never sums `man_1` and `man_2`.
- [ ] Implement, run `yarn vitest run src/features/elections/analytics/lib`, commit.

### Task 2: Reads, keys, server read, search contract, route

**Files:**
- Create: `src/features/elections/analytics/api/elections-analytics-api.ts` (`fetchLocalMandates(signal)`, `fetchCountyCouncil(code, signal)`), `src/features/elections/analytics/api/elections-analytics-ssr.ts` (`readLocalMandatesForSsr(signal)`), `src/features/elections/analytics/hooks/use-elections-analytics.ts` (`localMandatesQueryOptions()`, `useLocalMandates(initial?)`, `useCountyCouncil(code)`)
- Modify: `src/features/elections/lib/elections-catalog-keys.ts` (add `electionsAnalyticsKeys`), `src/features/elections/api/elections-catalog-ssr.ts` (export `settle`, `deadline`), `src/schemas/elections-search.ts` (`electionsAnalyticsSearchSchema`, `parseElectionsAnalyticsSearch`)
- Create: `src/routes/alegeri/analize.tsx`, `src/routes/alegeri/analize.lazy.tsx`
- Test: `src/routes/alegeri/-analize.test.tsx`, `src/schemas/elections-search` cases in `src/schemas/elections.test.ts`

Search: `tip ∈ views`, `dupa ∈ that view's tabs`, `judet ∈ ROMANIA_COUNTIES codes`; each unreadable value `undefined`, every key returned. Head: title, description, canonical `/alegeri/analize` on the bare page; `noindex, follow` and no canonical with any key. No-store headers.

- [ ] Tests: parse bad values to `undefined` with all three keys present; head bare vs keyed; loader on the server returns `{ mandates }` on success and `{}` on failure.
- [ ] Implement, run tests, commit.

### Task 3: The page

**Files:**
- Create: `src/features/elections/analytics/lib/analytics-views.ts` (from `tabs.ts`), `src/features/elections/analytics/components/analytics-charts.tsx` (`LegendRow`, `Waffle`, `PhasePair`, `CountyTiles`, `Absent`, `TabPending`, `SuspectMark`), `src/features/elections/analytics/components/mandate-view.tsx` (`MandateFigures`, `MandateTab`, `mandateNotes`), `src/features/elections/analytics/components/elections-analytics-page.tsx` (head, bar, jump row, sections, sources)
- Modify: `src/features/elections/catalog/elections-catalog-page.tsx` (one link to the analysis page)
- Test: `src/features/elections/analytics/components/elections-analytics-page.test.tsx`, `src/features/elections/analytics/components/analytics-charts.test.tsx`
- Integration: `tests/integration/elections-analytics.spec.ts`

Reuse: `NotesMarker`, `ShareIcon` (national budget), `HubFiguresBand` (`plain`, `arrow`), `RuledFrame`, `TwoLayerLattice`, `CornerTicks`, `CruxMarks`. View change: `navigate({ search: { tip, dupa: undefined, judet }, resetScroll: false })`. Jump row: `<Link search={{ ...every key, dupa }} hash={id} replace resetScroll={false}>`.

- [ ] Tests: the review-focus cases above; the bar lists five views; Mandate draws four figures and five sections.
- [ ] Implement; Lingui extract after telling root; `yarn check`; integration spec under the heavy lock; commit.

### Then

One Sol review; head to the SEO session; merge origin/dev; owner's word; pre-push note to root.
