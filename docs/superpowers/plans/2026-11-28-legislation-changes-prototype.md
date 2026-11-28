# Modificări redesign — prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/development` prototype of the new Modificări page (layout B) on live dev data, for the owner to review on the :3012 preview before the real page is replaced.

**Architecture:** Three prototype files under `src/development/prototypes/legal/`: a pure model (kinds, grouping, verbs), a prototype-local API (the feature's `graphqlQuery`, selecting `sourceAct.summary.description`), and the page. State lives in the component (the URL mapping is the promotion plan's). Nothing outside `src/development/` and this plan changes.

**Tech Stack:** React 19, TanStack Query (`useQuery`, `useInfiniteQuery`), Lingui macros (excluded from catalogues under `src/development/`), shadcn `Sheet` + `@/components/filters/filter-sheet/filter-sheet-parts`, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-28-legislation-changes-redesign-design.md`

## Global Constraints

- Only `src/development/prototypes/legal/changes.*` and this plan are created; no catalogue, schema, adapter or route change.
- Change kinds: `abrogare-totala, abrogare-partiala, modificare, completare, suspendare, incetare-suspendare, republicare, rectificare, iesire-din-vigoare`. New-law kinds: `promulgare, aprobare-oug, aprobare-og`.
- The server rejects `kinds: []` and `undatedOnly` with `since`/`until`: never send either.
- „Today" is `localIsoDate()` and tomorrow `localIsoDate(1)` from `src/features/legal/lib/legal-format`.
- Status marks: `LegalStatusBadge` from `src/features/legal/components/legal-status-badge`. Compact rows, borders not shadows.
- Heavy runs (unit suite, check) under `flock -x /home/sysadmin/projects/agent-sessions/client-heavy.lock systemd-run --user --wait --pipe -q -p MemoryMax=8G -p MemorySwapMax=0`.
- Commits: `git commit --only` own paths, subject ≤ 50 chars, no trailers.

## Review Focus

1. A changing act's events split across two pages, not adjacent → one block, not two (Task 1 test `merges a group split by another group and by a page`).
2. Upcoming count 0 → no „Urmează" heading at all (Task 3 test `hides the upcoming group when nothing is upcoming`).
3. A kind filter that excludes every kind of the tab → the tab's own kinds are never replaced by an empty list (Task 2 test `never sends an empty kinds list`).
4. A count query fails → the tab label shows no number and the list still renders (Task 3 test `keeps the list when a count fails`).
5. A changing act with no description → a block with no description line, never an empty paragraph (Task 3 test `shows no description line without one`).

---

### Task 1: Model — kinds, verbs, blocks

**Files:**
- Create: `src/development/prototypes/legal/changes.model.ts`
- Test: `src/development/prototypes/legal/changes.model.test.ts`

**Interfaces:**
- Produces:
  - `CHANGE_KINDS`, `NEW_LAW_KINDS` (readonly string tuples, values above)
  - `type ChangeRow = { eventId: string; eventKind: string; effectiveDate: string | null; actId: string; displayCitation: string; status: string; sourceAct: { actId: string; displayCitation: string; description: string | null } | null }`
  - `type ChangeLine = { actId: string; displayCitation: string; status: string; kinds: readonly string[] }`
  - `type ChangeBlock = { key: string; date: string | null; source: { actId: string; displayCitation: string; description: string | null } | null; kind: string | null; lines: readonly ChangeLine[] }` (`kind` set only when `source` is null)
  - `groupChanges(rows: readonly ChangeRow[]): readonly ChangeBlock[]`
  - `kindVerb(kind: string): string` and `joinVerbs(kinds: readonly string[]): string`
  - `sourcelessHead(kind: string): string` („Republicări", „Rectificări", else the kind's label from `legalEventKindLabel`)

- [ ] **Step 1: Write the failing tests**

```ts
it('groups by changing act and date, one line per changed act, kinds joined', () => {
  const blocks = groupChanges([
    row({ eventId: '1', source: 'L33', date: '2026-06-25', act: 'L236', kind: 'modificare' }),
    row({ eventId: '2', source: 'L33', date: '2026-06-25', act: 'L236', kind: 'completare' }),
  ])
  expect(blocks).toHaveLength(1)
  expect(blocks[0].lines).toEqual([expect.objectContaining({ actId: 'L236', kinds: ['modificare', 'completare'] })])
  expect(joinVerbs(blocks[0].lines[0].kinds)).toBe('modifică și completează')
})
it('merges a group split by another group and by a page', () => {
  const blocks = groupChanges([row({ eventId: '1', source: 'A', date: 'd', act: 'x' }), row({ eventId: '2', source: 'B', date: 'd', act: 'y' }), row({ eventId: '3', source: 'A', date: 'd', act: 'z' })])
  expect(blocks.map((b) => b.source?.actId)).toEqual(['A', 'B'])
  expect(blocks[0].lines.map((l) => l.actId)).toEqual(['x', 'z'])
})
it('groups events with no changing act by kind and date', () => {
  const blocks = groupChanges([row({ eventId: '1', source: null, date: '2026-07-29', act: 'i', kind: 'republicare' }), row({ eventId: '2', source: null, date: '2026-07-29', act: 'o', kind: 'republicare' })])
  expect(blocks).toHaveLength(1)
  expect(blocks[0]).toMatchObject({ source: null, kind: 'republicare' })
  expect(sourcelessHead('republicare')).toBe('Republicări')
})
it('keeps the same changing act on two dates as two blocks', () => { /* source A on d1 and d2 → 2 blocks */ })
it('says every change kind as a verb', () => {
  expect(CHANGE_KINDS.map(kindVerb)).toEqual(['abrogă', 'abrogă parțial', 'modifică', 'completează', 'suspendă', 'încetează suspendarea', 'republică', 'rectifică', 'scoate din vigoare'])
})
```

(`row` is a test helper building a `ChangeRow`.)

- [ ] **Step 2: Run, expect FAIL** — `yarn vitest run src/development/prototypes/legal/changes.model.test.ts` → module not found.
- [ ] **Step 3: Implement** — `groupChanges` walks rows once with a `Map<key, block>` in first-appearance order; key `s:<sourceActId>|<date ?? 'none'>` or `k:<kind>|<date ?? 'none'>`; a line per changed `actId`, kinds deduplicated in arrival order. Verbs with `t` macros.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `feat(legal): Changes prototype model`.

### Task 2: Prototype API

**Files:**
- Create: `src/development/prototypes/legal/changes.api.ts`
- Test: `src/development/prototypes/legal/changes.api.test.ts`

**Interfaces:**
- Consumes: `ChangeRow`, `CHANGE_KINDS` (Task 1); `graphqlQuery` from `@/lib/graphql/graphql-client`.
- Produces:
  - `type ChangesQuery = { kinds: readonly string[]; since?: string; until?: string; undatedOnly?: boolean }`
  - `fetchChangesPage(q: ChangesQuery, opts: { first?: number; after?: string; signal?: AbortSignal }): Promise<{ items: ChangeRow[]; endCursor: string | null }>`
  - `fetchChangesCount(q: ChangesQuery, opts?: { signal?: AbortSignal }): Promise<number | null>`
  - `narrowKinds(tabKinds: readonly string[], chosen: readonly string[]): readonly string[]` — chosen ∩ tab kinds, or the tab kinds when that is empty.

- [ ] **Step 1: Write the failing tests** (mock `graphqlQuery`)

```ts
it('asks for the changing act description', async () => { await fetchChangesPage({ kinds: ['modificare'] }, {}); expect(query()).toContain('summary { description }') })
it('never sends an empty kinds list', () => { expect(narrowKinds(CHANGE_KINDS, [])).toEqual(CHANGE_KINDS); expect(narrowKinds(CHANGE_KINDS, ['promulgare'])).toEqual(CHANGE_KINDS); expect(narrowKinds(CHANGE_KINDS, ['modificare'])).toEqual(['modificare']) })
it('drops the window when asking for undated events', async () => { await fetchChangesPage({ kinds: ['abrogare-totala'], since: '2026-01-01', undatedOnly: true }, {}); expect(variables()).toEqual(expect.not.objectContaining({ since: expect.anything() })); expect(variables()).toMatchObject({ undatedOnly: true }) })
it('maps a node, status enum to kebab, no description to null', async () => { /* node with sourceAct.summary null → description null; status 'ABROGAT_PARTIAL' → 'abrogat-partial' */ })
it('reads the count, null when absent', async () => { /* totalCount 52179 → 52179; missing → null */ })
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** — the query of `legal-changes-api.live.ts` with `kinds` as a list and `sourceAct { actId displayCitation summary { description } }`; the count as its own query (the same field-error reason as the live adapter); the status map copied from it.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `feat(legal): Changes prototype reads`.

### Task 3: The page and the prototype entry

**Files:**
- Create: `src/development/prototypes/legal/changes.page.tsx`, `src/development/prototypes/legal/changes.prototype.tsx`
- Test: `src/development/prototypes/legal/changes.page.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–2; `LegislationShell` (`activeTab="modificari"`), `useLegislationFrontier('changes')`, `LegalStatusBadge`, `formatLegalDate`, `formatLegalNumber`, `localIsoDate`.
- Produces: `ChangesPrototype` (zero-prop component); `prototype` definition, one variant `blocuri`, title „Legislație — Modificări (prototip, 28 noiembrie)", a note saying what the owner decided and that reads are live.

Page, per the spec's „The design": tabs `schimbari` (default) / `legi-noi` / `fara-data` with their unfiltered counts; on `schimbari` the „Urmează să intre în vigoare · N" group (since tomorrow, narrowed kinds, all loaded at once, `first: 50`) then „Intrate în vigoare" (until min(range end, today), since range start) paged 20 by `useInfiniteQuery` and grouped with `groupChanges` over all loaded rows; `legi-noi` rows (no date bound) and `fara-data` rows (`undatedOnly`); „Filtre" opens a `Sheet` with de la / până la (native date fields, 16px) and the tab's kinds as toggles; the filtered count in the list head when a filter is on; the shortened freshness note above the tabs; „Încarcă mai multe" disabled while fetching.

- [ ] **Step 1: Write the failing tests** (mock `./changes.api`; render inside a QueryClientProvider and the shell's test stand-ins used by `legislation-shell.test.tsx`)

```ts
it('shows one block per changing act with its description and lines', async () => { /* L33 block: link „Legea nr. 33/2026", text of description, „modifică și completează" + „Legea nr. 236/2022" */ })
it('puts upcoming changes above those in force', async () => { /* heading „Urmează să intre în vigoare" precedes „Intrate în vigoare" in document order; future date says „intră în vigoare la" */ })
it('hides the upcoming group when nothing is upcoming', async () => { /* upcoming page empty → queryByText(/Urmează să intre/) null */ })
it('shows no description line without one', async () => { /* description null → block has no <p> description */ })
it('lists undated repeals as rows', async () => { /* click „Fără dată" → listitem „Ordinul nr. 168/2015 abrogat" and fetchChangesPage called with undatedOnly true */ })
it('keeps the list when a count fails', async () => { /* fetchChangesCount rejects → tab label without number, blocks still shown */ })
it('narrows both lists by the chosen kind', async () => { /* choose „modificare" in the panel → both page fetches called with kinds ['modificare'] */ })
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** the page and the entry.
- [ ] **Step 4: Run, expect PASS**; then `yarn run check` and the unit suite under the shared lock → 0.
- [ ] **Step 5: Look at it** on `https://zeus-agents-01.basa-discus.ts.net:3012/development/legal/changes` (never the /development index; never restart the preview's unit — if a class change does not show, check by client-side navigation) at 1280 and 390 px; screenshots to the scratchpad `shots/`.
- [ ] **Step 6: Commit** — `feat(legal): Changes page prototype`.

### Task 4: Owner review

- [ ] Send the owner the screenshots (desktop: tabs, upcoming, blocks; phone: the same and the open panel) and the preview link, and ask what to change. Iterate without committing every round; commit when the owner is happy. Promotion is its own plan.
