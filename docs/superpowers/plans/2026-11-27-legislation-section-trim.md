# Legislation section trim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/legislation/search` lists acts by filter when no term is typed, and Acte, Monitorul Oficial and Ghid retire
behind permanent redirects, with a three-entry bar and a hub without the gazette band.

**Architecture:** The search page asks `legalActs` (cursor-paged, ordered by citations) when it has filters and no term.
It reuses its own act rows. The three retired routes keep their files only as `beforeLoad` 301 redirects (the pattern
of `src/routes/legislation/acts/$actId_.text.tsx`). Their page components go.

**Tech Stack:** TanStack Start/Router, TanStack Query, Lingui, Vitest + Testing Library, Playwright (integration).

**Spec:** `docs/superpowers/specs/2026-11-27-legislation-section-trim-design.md`

## Global Constraints

- Client only. Data comes from the dev API. No server change.
- `src/routeTree.gen.ts` is regenerated (`yarn router:generate`), never hand-edited.
- Catalogues: run the extract on this branch; commit only `src/locales/{ro,en}/messages.po` (never admin.po/pnrr.po);
  fill en and ro by hand. Send root a catalogue note before the extract.
- Commits: `git commit --only <paths>`, subject ≤ 50 characters, no attribution trailers; never amend, rebase, reset
  or stash. The hook runs `yarn check`; run heavy steps under
  `flock <scratchpad>/heavy.lock systemd-run --user --wait --pipe -q -p MemoryMax=8G -p MemorySwapMax=0 …`.
- With no status chosen and „include istorice" off, the list keeps the server's live statuses exactly:
  `in-vigoare, modificat, abrogat-partial, suspendat, necunoscut` (server `LEGAL_LIVE_STATUSES`,
  `src/modules/legal/core/legal-engine-filter.ts`).
- Old Acte links: `actType`→`tip`, `year`→`an`, `domain`→`domeniu`, `status`→`stare`, `status=toate`→`historical=true`, an absent
  `status`→`stare=in-vigoare`; unreadable values drop. `/legislation/gazette` and `/legislation/guide` → `/legislation`.
  Every redirect is `statusCode: 301, replace: true`.
- The /development prototypes stay. Only their links change.

## Review Focus

1. **Language kept across a redirect**: `/legislation/acts?lang=en&status=abrogat` must land in English. `lang` is carried on all three redirects (Task 3 tests).
2. **A filter change resets the list**: after „Încarcă mai multe", changing a filter must not append pages of the old filter. The query key holds the filter (Task 2 test).
3. **Clearing the term with filters on** shows the list, not the examples, and typing a term again shows results by relevance (Task 2 test).
4. **An old link with a type the search does not know** (`?actType=anexa`) forwards without `tip` and with `stare=in-vigoare`. It must not error (Task 3 test).
5. **The filter panel with no term** (`asked={false}`): choosing a filter from the panel shows the list (Task 2 test). Check what `asked` changes inside `LegislationFilterPanel` before relying on it.

---

### Task 1: The act list takes the search's filter

**Files:**
- Modify: `src/features/legal/lib/search-filters.ts` (add `LIVE_STATUSES`, `browseFilter`)
- Modify: `src/features/legal/api/legal-acts-api.ts`, `legal-acts-api.live.ts`, `legal-acts-api.mock.ts`
- Test: `src/features/legal/lib/search-filters.test.ts`, `src/features/legal/api/legal-acts-api.live.test.ts` (create if absent)

**Interfaces:**
- Produces: `LIVE_STATUSES: readonly ['in-vigoare','modificat','abrogat-partial','suspendat','necunoscut']`;
  `browseFilter(filters: SearchFilters): LegalSearchFilter`;
  `fetchLegalActsPage(filter: LegalSearchFilter, options?: { first?: number; after?: string; signal?: AbortSignal }): Promise<LegalActsPage>` (same name, new filter type)

- [ ] **Step 1: Write the failing tests**
  - `browseFilter`: `NO_SEARCH_FILTERS` with `tip:['lege']` → `{ actType:['lege'], status:[...LIVE_STATUSES] }`; `stare:'toate'` → no `status` key; `stare:'abrogat'` → `status:['abrogat']`; a year range and domain/category/`sanctiuni` pass through as `searchArgs` gives them.
  - Live adapter: with a mocked `graphqlQuery`, `fetchLegalActsPage({ actType:['lege','oug'], yearFrom:2020, yearTo:2024 }, { after:'c1' })` sends `filter: { actType:{in:['lege','oug']}, yearFrom:{gte:2020}, yearTo:{lte:2024} }`, `after:'c1'`, `first:20`.
- [ ] **Step 2: Run** `yarn vitest run src/features/legal/lib/search-filters.test.ts src/features/legal/api/legal-acts-api.live.test.ts`. Expected: FAIL (`browseFilter` undefined; filter shape mismatch).
- [ ] **Step 3: Implement.** `browseFilter` is `searchArgs(filters).filter`, plus `status: [...LIVE_STATUSES]` when the reader chose no status and not „Toate". The live adapter builds its filter with `legalSearchFilterInput` (export it from `legal-search-api.live.ts` if needed). The mock filters `mostCitedActs` by `actType`, `status` and the year range, and says in a comment that it ignores domain/category/penalties.
- [ ] **Step 4: Run the same command.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(legal): Act list takes the search filters`.

### Task 2: The search lists acts with filters and no term

**Files:**
- Modify: `src/features/legal/components/legislation-act-finder.tsx` (a file-local `Browse` beside `Answer`, reusing `ActRow`, `ROW_GRID`, `PendingRows`)
- Test: `src/features/legal/components/legislation-act-finder.test.tsx`

**Interfaces:**
- Consumes: `browseFilter`, `fetchLegalActsPage` (Task 1); `isSearchFiltered` (existing).
- Produces: nothing outside the file.

- [ ] **Step 1: Write the failing tests** (mock `fetchLegalActsPage`):
  - `'lists the acts most cited first when filters are set and no term is typed'`: address `{ tip:'lege', stare:'in-vigoare' }` → rows link to `/legislation/acts/<id>` in the returned order, and the line „2 acte, cele mai citate întâi" shows.
  - `'shows the examples with no term and no filter'`: `{}` → the examples (`Ways`) and no `fetchLegalActsPage` call.
  - `'answers by relevance once a term is typed'`: `{ q:'98', tip:'lege' }` → `fetchLegalSearch` called, `fetchLegalActsPage` not.
  - `'loads more with the cursor'`: the first page has `endCursor:'c1'` → „Încarcă mai multe" asks with `after:'c1'` and appends.
  - `'starts over when a filter changes'` (Review Focus 2): after loading more, change `tip` → only the new filter's first page shows.
  - `'says no act matches'`: an empty page → „Niciun act nu corespunde filtrelor."
  - `'a filter chosen in the panel with no term shows the list'` (Review Focus 5), and `'clearing the term keeps the filters and shows the list'` (Review Focus 3).
- [ ] **Step 2: Run** `yarn vitest run src/features/legal/components/legislation-act-finder.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** Render `<Browse filters={filters} />` where `Ways` is now, when `!asked && isSearchFiltered(filters)`. Read pages with `useInfiniteQuery`: `queryKey: ['legal','finder-browse', browseFilter(filters)]`, `getNextPageParam` = `endCursor`. Each item becomes an `ActRow` with `hit = { score: 0, act, description: null, name: null }`, `words = []` and `provisions = []`. Copy: ro `plural(total, { one: '# act', few: '# acte', other: '# de acte' })` + „, cele mai citate întâi"; en "# act/acts, most cited first". A null `totalCount` says „Actele, cele mai citate întâi". Pending, error and retry reuse the `Answer` states' look.
- [ ] **Step 4: Run the same command.** Expected: PASS, the old tests too.
- [ ] **Step 5: Commit** `feat(legal): Search lists acts by filter alone`.

### Task 3: Retire Acte, Monitorul Oficial and Ghid behind 301s

**Files:**
- Modify: `src/routes/legislation/acts/index.tsx`, `src/routes/legislation/gazette.tsx`, `src/routes/legislation/guide.tsx` (each becomes a redirect-only route)
- Delete: `src/routes/legislation/acts/index.lazy.tsx`, `gazette.lazy.tsx`, `guide.lazy.tsx`; `src/features/legal/components/legislation-acts-directory.tsx`, `legislation-gazette-directory.tsx`, `legislation-guide.tsx` and their `.test.tsx`
- Modify: `src/features/legal/lib/search-filters.ts` (add `searchOfActsDirectory`)
- Modify: `src/schemas/legal-search.ts` / `src/schemas/legal.ts` / `src/schemas/legal.test.ts` — remove `gazetteBrowseSearchSchema` and its test only if nothing else imports it. Keep `GazetteBrowseFilter` and `legal-gazette-api.ts`: the landing prototype uses them.
- Test: `src/routes/legislation/-retired-redirects.test.ts` (create, modelled on `src/routes/-national-budget-legacy-redirects.test.ts`); `src/routes/legislation/-headers.test.ts` (drop the three routes; the header says "four pages")

**Interfaces:**
- Produces: `searchOfActsDirectory(search: Record<string, unknown>): { tip?: string; an?: string; domeniu?: string; stare?: string; historical?: true; lang?: string }`

- [ ] **Step 1: Write the failing tests**
  - `searchOfActsDirectory`: `{}` → `{ stare:'in-vigoare' }`; `{ status:'toate' }` → `{ historical:true }`; `{ actType:'lege', year:2020, domain:'sanatate', status:'abrogat' }` → `{ tip:'lege', an:'2020', domeniu:'sanatate', stare:'abrogat' }`; `{ actType:'anexa' }` → `{ stare:'in-vigoare' }` (Review Focus 4); `{ lang:'en' }` keeps `lang:'en'`.
  - Redirects: `/legislation/acts/` → `redirect({ to:'/legislation/search', search: searchOfActsDirectory(search), replace:true, statusCode:301 })`. `/legislation/gazette` with `{ year:2010, lang:'en' }` → `{ to:'/legislation', search:{ lang:'en' }, … }`, and `/legislation/guide` the same (Review Focus 1).
- [ ] **Step 2: Run** `yarn vitest run src/routes/legislation src/features/legal/lib/search-filters.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Each route file is `createFileRoute(<path>)({ beforeLoad: ({ search }) => { throw redirect(…) } })` with a passthrough `validateSearch` that keeps the raw record. The route comment says when and why the page retired (owner, 27 November 2026). Delete the lazy files and components. Run `yarn router:generate`.
- [ ] **Step 4: Run the same command.** Expected: PASS. Then `yarn typecheck`: no import left of the deleted files.
- [ ] **Step 5: Commit** `feat(legal): Retire Acte, gazette and guide pages`.

### Task 4: A three-entry bar and a hub without the gazette

**Files:**
- Modify: `src/features/legal/components/legislation-shell.tsx` (`LegislationTab = 'cauta' | 'analiza' | 'modificari'`; `legislationPages()` keeps those three; the `to` union shrinks)
- Modify: `src/features/legal/components/hub/legislation-hub.tsx`:
  - remove `<GazetteBand />` and its import;
  - shortcuts: „Acte" → `to="/legislation/search" search={{ stare: 'in-vigoare' }}`; drop the Monitorul Oficial link;
  - keep the sources line.
- Modify: `src/features/legal/components/hub/legislation-hub-bands.tsx` (delete `GazetteBand` and the gazette imports nothing else uses); `legislation-hub-lib.ts` (drop the `monitor` section)
- Modify: `src/development/prototypes/legal/landing.page.tsx`, `search.r2.head.tsx` (links: Acte → search, drop gazette and guide entries)
- Test: `legislation-shell.test.tsx`, `legislation-shell.router.test.tsx`, `hub/legislation-hub-lib.test.ts`, and the hub/page tests that name the band or the shortcuts

- [ ] **Step 1: Update the tests first.** The bar shows exactly „Caută", „Analiză", „Modificări". The hub has no „Numerele Monitorului Oficial" band. `legalHubSections()` ids are `['schimbari','feluri','emitenti','ani','legaturi']`. The „Acte" shortcut's href is `/legislation/search?stare=in-vigoare`.
- [ ] **Step 2: Run** `yarn vitest run src/features/legal src/routes/legislation`. Expected: the updated tests FAIL.
- [ ] **Step 3: Implement** as listed under Files.
- [ ] **Step 4: Run the same command, then `yarn typecheck`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(legal): Three-page bar, hub without gazette`.

### Task 5: Catalogue, browser check, gates

**Files:**
- Modify: `src/locales/ro/messages.po`, `src/locales/en/messages.po`
- Create: `tests/integration/legislation-retired-pages.spec.ts`

- [ ] **Step 1: Integration spec.** `request.get('/legislation/acts?status=abrogat&lang=en', { maxRedirects: 0 })` → 301 with `location` containing `/legislation/search` and `stare=abrogat` and `lang=en`. `/legislation/gazette` and `/legislation/guide` → 301 to `/legislation`. Run it on this session's own ports: `CI=true PLAYWRIGHT_APP_PORT=3043 PLAYWRIGHT_SSR_API_PORT=3243 E2E_MODE=mock npx playwright test --project=integration tests/integration/legislation-retired-pages.spec.ts`. Expected: PASS.
- [ ] **Step 2: Catalogue.** Send the catalogue note to root, run `yarn i18n:extract`, and restore admin.po and pnrr.po. Fill the new ids by hand in en and ro, and check each new English msgstr is not the Romanian source. Expected: the ids added are only the total line's. The ids dropped are those of the three deleted pages and the gazette band.
- [ ] **Step 3: Browser check** on the preview (:3012): `/legislation/search?tip=lege&stare=in-vigoare` at 1280 and 360 px, „Încarcă mai multe" once; the bar; the hub without the band; the three old addresses forward.
- [ ] **Step 4: Gates under the heavy lock:** `yarn check`, `yarn test`, the integration specs (landing-page, experimental-search, legislation-act, legislation-retired-pages). Expected: all pass.
- [ ] **Step 5: Commit** `chore(i18n): Catalogues for the section trim` (catalogues only) and `test(legal): Retired legislation pages forward` (spec).

After Task 5, the review runs: two Codex rounds (gpt-6.2-astra, max, read-only, code-only brief, command list checked). The legislation session reads the round-2 fixes. Then merge origin/dev (it has the Mac fixes, pin c3ab89750) and run the gates on the merge. The pre-push note goes to root; root pushes.
