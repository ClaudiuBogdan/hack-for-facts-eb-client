# Feature: NGO Landing & Source-Coverage Overview (`/ong-uri`)

> MVP-5 — onboards every user type and bakes the "stale data" caveat into the product
> honestly. Source UX: `docs/ux-research/ngos.md` §10.1, §13 MVP-5. Domain design:
> `docs/design/ngos/design.md`. Foundation: `CoverageRibbon`, `FreshnessBadge`,
> `DataStatusBadge`.

## Feature owner profile

Frontend implementation subagent specializing in **domain landing / overview surfaces**
(React 19 + TypeScript, TanStack Router, shadcn `Table`/`Card` for entry points,
Lingui, TanStack Query). Reuses the existing entity search component and owns the
`CoverageRibbon`. Low complexity, high onboarding value.

## Summary

The domain's front door: a concise explainer of what the NGO domain is (evidence over
identity), a **source-coverage + freshness matrix** (which registries are loaded, how
fresh, how many rows, with explicit gaps like empty financials and stale snapshots), a
prominent search box, and entry cards to the two discovery surfaces and the name-only
listings. It sets correct expectations before users reach a profile.

## Facts / Decisions / Assumptions

- **Fact (coverage matrix content):**
  | Sursă (autoritate) | Conținut | Ultimul instantaneu | Stare | Rânduri |
  | --- | --- | --- | --- | --- |
  | ANOFM (RUEIS) | Membri economie socială | — (din load 2026-06-20) | Încărcat | 9.176 |
  | ANOFM (acreditare ocupare) | Furnizori servicii de ocupare | — | Încărcat | 1.313 |
  | MMuncii (furnizori) | Furnizori servicii sociale | 10.04.2024 | Încărcat · posibil depășit | 4.033 |
  | MMuncii (servicii) | Servicii sociale licențiate | 11.12.2023 | Încărcat · posibil depășit | 5.407 |
  | ANAF (financiar) | Indicatori financiari | — | În curs (0 rânduri) | 0 |
  | MJ (registru ONG) | Registrul național ONG | — | Doar referință (neconfirmat) | 126.011 (brut) |
  | SGG (utilitate publică) | Recunoașteri utilitate publică | — | Doar referință (neconfirmat) | 229 (brut) |
- **Fact:** Full prod load 2026-06-20 (run 4931, 19,929 rows), gate green 15/15.
- **Fact:** MJ/SGG are name-only, not promoted; financials are 0 rows.
- **Decision:** Route `/ong-uri`; this is the landing + search hub and the sidebar
  entry point ("ONG-uri").
- **Decision:** The coverage matrix is honest about gaps — empty financials and stale
  snapshots are shown as states, not hidden.
- **Assumption:** Row counts come from the source contracts / `source_snapshots` /
  inventory; the page consumes a typed `domainCoverage` adapter rather than hard-coding
  numbers, so they refresh with the data. The numbers above are the mock seed values
  (from the UX doc), marked as such.

## Route and URL state

- **Route:** `/ong-uri` (file route `ong-uri.index.tsx`).
- **Search params:** `q?` — pre-fills the search box / deep-link; `lang?`. Default view
  = no params. Submitting search navigates to the entity-search results (existing
  search route) or, for a resolved CUI, directly to `/ong-uri/$cui`.
- **Decision:** Entry-card links carry `from=ong-landing` for backtracking.

## Data contract and mock states

```ts
type SourceCoverageRow = {
  sourceId: string                    // ANOFM_RUEIS | ANOFM_ACCRED | MMUNCII_PROV | ...
  authorityLabel: string
  contentLabel: string                // plain-language Romanian
  lastSnapshotDate: string | null
  status: 'loaded' | 'loaded_stale' | 'pending' | 'name_only' | 'blocked'
  rowCount: number | null
  isNameOnly: boolean
  sourceSnapshotId: string | null     // links to /ong-uri/sursa/$snapshotId
}

type DomainCoverage = {
  rows: SourceCoverageRow[]
  lastFullLoad: { runId: string; date: string; rowsLoaded: number; gate: string }
  knownGaps: string[]                 // e.g. "Date financiare ANAF în curs"
}
```

**Mock states:**
1. **Default** — full matrix as in the Facts table, with `lastFullLoad` summary.
2. **All-fresh hypothetical** — for visual QA of non-stale styling.
3. **Search prefilled** — `?q=asociatia` showing the search box populated.

Mark mock with `DataStatusBadge variant="mock"`.

## UI structure

Constrained `max-w-5xl mx-auto px-6`, 8pt grid. No hero/gradient (foundation +
DESIGN_PRINCIPLES).

1. **Title + intent:** "ONG-uri și furnizori de servicii sociale" (`text-2xl
   font-semibold`) + one paragraph: dovezi din registre publice, ancorate pe CUI; ce
   pot și ce nu pot afla aici.
2. **Search box:** reuse `EntitySearch` (ONG-scoped placeholder "Caută o organizație
   după nume sau CUI"). Submitting routes to results / profile.
3. **`CoverageRibbon`:** compact one-line summary (last full load date, total rows,
   "2 instantanee posibil depășite", "financiar în curs").
4. **Source-coverage matrix:** a real `Table` (desktop) / stacked blocks (mobile):
   columns Sursă · Conținut · Ultimul instantaneu (`FreshnessBadge`) · Stare
   (`DataStatusBadge`: loaded/stale/pending/name_only) · Rânduri. Stale rows get the
   amber freshness style; name-only rows link to the name-only surfaces; rows with a
   snapshot id link to `/ong-uri/sursa/$snapshotId`.
5. **Known caveats panel:** short `Alert`/list — "Datele financiare (ANAF) sunt în
   curs de actualizare", "Instantaneele pentru servicii sociale sunt din 2023–2024",
   "Înregistrările MJ/SGG sunt referințe neconfirmate".
6. **Entry cards (2–4):** record cards (not nested) linking to:
   - "Caută servicii sociale" → `/ong-uri/servicii`.
   - "Registrul ONG (MJ) — referințe" → `/ong-uri/registru` (Next-2; show "în curând"
     if not yet built).
   - "Utilitate publică (SGG) — referințe" → `/ong-uri/utilitate-publica` (Next-2).
   Each card: title, one-line description, row count, status badge.

## Component reuse and proposed new components

- **Reuse:** `EntitySearch`/`FloatingEntitySearch`, `Table`, `Card` (entry cards only),
  `Alert`, `Badge`, `Button`, `Skeleton`, `EmptyState`, `Breadcrumb`.
- **Consume:** `FreshnessBadge`, `DataStatusBadge`, `SourceCitationChip` (link to
  snapshot pages).
- **New (owned here):**
  - `CoverageRibbon` — compact page-level source/freshness/gap summary (foundation
    component; implement here, reusable cross-domain).
  - `SourceCoverageTable` — the matrix table with status + freshness + links.

## Interactions

- Search submit → resolve to `/ong-uri/$cui` if a single CUI matches, else entity-search
  results scoped to organizations/NGOs.
- Matrix row with snapshot → `/ong-uri/sursa/$snapshotId`.
- Name-only matrix rows / entry cards → name-only surfaces (or disabled "în curând"
  state pre-Next-2).
- Entry card click → respective discovery route with `from=ong-landing`.

## Loading, empty, error, partial, stale states

- **Loading:** matrix and ribbon show skeletons; search box renders immediately.
- **Empty:** if coverage adapter returns no rows (shouldn't happen) → `EmptyState`
  "Nu există surse încărcate pentru acest domeniu."
- **Partial:** pending/0-row sources shown explicitly as "În curs (0 rânduri)", never
  omitted.
- **Stale:** stale snapshots flagged with `FreshnessBadge` + `DataStatusBadge=stale`
  and called out in the caveats panel.
- **Error:** coverage fetch failure → inline `Alert` + retry; the search box still
  works (degraded gracefully); URL preserved.

## Accessibility and i18n

- Matrix is a semantic `Table` with `<th scope>`; stacked mobile blocks keep
  label/value pairing. Status conveyed by text + badge, not color alone.
- Entry cards are links with descriptive text; `FreshnessBadge` has text.
- Lingui throughout; expand ONG/CUI/ANOFM/MMuncii/MJ/SGG/RUEIS on first use; locale-aware
  dates and row counts (thousands separators).

## Privacy, provenance, and source-citation behavior

- The page's purpose is provenance/expectation-setting: it names sources, dates, row
  counts, and gaps up front.
- Name-only sources are labeled as referințe neconfirmate even at the directory level.
- No invented totals — counts come from the coverage adapter (mock-seeded from the UX
  doc, marked mock).

## Acceptance checklist

- [ ] `/ong-uri` route renders title, intent, search, `CoverageRibbon`, source-coverage
      matrix, caveats panel, and entry cards; default view needs no params.
- [ ] Matrix shows all sources with content, last snapshot, status, and row counts;
      stale + name-only + pending states are visually distinct and text-labeled.
- [ ] Search resolves to `/ong-uri/$cui` or scoped results.
- [ ] Entry cards link to `/ong-uri/servicii` and (Next-2) name-only surfaces, with an
      "în curând" state when those routes don't exist yet.
- [ ] Snapshot-bearing rows link to `/ong-uri/sursa/$snapshotId`.
- [ ] Sidebar gains an "ONG-uri" entry to this route.
- [ ] All mock states render; mock surfaces marked with `DataStatusBadge`.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled; smoke test for the matrix.

## Non-goals

- No marketing hero, illustrations, or decorative backgrounds.
- No analytics dashboards on the landing (coverage matrix only).
- No live counts hard-coded — must come from the coverage adapter.

## Open questions (blockers only)

None. (Non-blocking: whether name-only entry cards link to live Next-2 routes or show
"în curând" depends on Next-2 sequencing; the landing handles both.)
