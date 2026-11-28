# Modificări redesign — promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/legislation/changes` becomes the approved prototype (`/development/legal/changes`, 2fce9f121): tabs, upcoming on top, one block per changing act with its description, the side panel — with its state in the address and old links working.

**Architecture:** The prototype's model moves to `features/legal/lib/legal-changes-blocks.ts`; the live adapter learns a list of kinds and the changing act's description; the URL schema gets Romanian keys and the route forwards old keys to them; the page is three components under `features/legal/components/changes/`; the old feed is deleted. The prototype stays as the record.

**Tech Stack:** TanStack Start/Router (validateSearch, beforeLoad redirect), TanStack Query, Lingui (catalogue extract on promotion), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-28-legislation-changes-redesign-design.md`; the prototype plan `docs/superpowers/plans/2026-11-28-legislation-changes-prototype.md` and its rulings (noun forms, the summaries note, phone tabs).

## Global Constraints

- Owner decisions as in the spec; the prototype as approved on 28 November 2026 is the visual reference.
- URL keys: `fila` (`legi-noi` | `fara-data`; absent = changes to existing acts), `fel` (comma-joined event kinds), `de`, `pana` (`YYYY-MM-DD`). Old keys `view`, `kind`, `since`, `until`, `source` forward with a 301 (`replace: true`), `lang` kept: `view=nedatate` → `fila=fara-data`; `view=viitoare|toate` → dropped; `kind=k` → `fel=k`, plus `fila=legi-noi` when k is a new-law kind; `since`/`until` → `de`/`pana` (dropped under `fara-data`); `source` dropped.
- `fetchRecentChangesPage` with no `kinds` still means every kind (the adapter's contract). The hub's recent-changes band follows the new page (owner, 28 November 2026: "Same rule now"): it asks for the change kinds only, its count too, and its words say changes to existing acts (Task 4b).
- Catalogues (I18N-001): note to root before the extract; extract only on this branch; commit only `src/locales/{ro,en}/messages.po`; fill en and ro by hand; never `admin.po`/`pnrr.po`.
- Heavy runs under `flock -x /home/sysadmin/projects/agent-sessions/client-heavy.lock systemd-run --user --wait --pipe -q -p MemoryMax=8G -p MemorySwapMax=0`. Commits `--only`, subjects ≤ 50 chars, no trailers. `yarn router:generate` after route changes.
- Review: Codex `gpt-6.2-astra`, `-c model_reasoning_effort=max -s read-only`, code-only brief forbidding database, cluster, kubectl, ssh and network access, at most two rounds; read each run's command list before using it. The legislation session coordinates and reads the fixes.

## Review Focus

1. A shared old link with both `view=nedatate` and `since` → lands on „Fără dată" without a window (Task 2 test `forwards an undated view without its window`).
2. `fel` naming kinds of another tab (`fila=legi-noi&fel=modificare`) → the tab's own kinds, never an empty list (Task 3 test `never sends an empty kinds list`, the prototype's).
3. `pana` past today on the default tab → capped at today, the future in the upcoming group (Task 4 test `caps the range at today`).
4. The hub band's call with no kinds → no `kinds` variable sent (Task 1 test `sends no kinds when none are asked`).
5. Back/forward between tabs → the list follows the address, no stale rows (Task 4 test `follows the address`).

---

### Task 1: Adapter and schemas

**Files:** Modify `src/schemas/legal.ts` (`legalRecentChangeSchema.sourceAct` gains `description: z.string().nullable()`; `legalChangesFilterSchema.kind` → `kinds: z.array(legalEventKindSchema).optional()`), `src/schemas/legal.test.ts`, `src/features/legal/api/legal-changes-api.live.ts` (+ `.live.test.ts`), `legal-changes-api.mock.ts` (+ its test if any), `src/features/legal/mocks/fixtures/legislation-changes.ts` (descriptions null).

**Interfaces — Produces:** `LegalChangesFilter = { since?; until?; kinds?: readonly LegalEventKind[]; source?; undated? }`; `LegalRecentChange.sourceAct: { actId; displayCitation; description: string | null } | null`.

- [ ] Tests first in `legal-changes-api.live.test.ts`: `sends the kinds as a list`, `sends no kinds when none are asked`, `reads the changing act description, null without a summary`; keep the existing `undated strips the window` test. Run → FAIL.
- [ ] Implement: the feed query selects `sourceAct { actId displayCitation summary { description } }`; `kinds` only when non-empty; the old feed component is adapted to `kinds: [kind]` until Task 4 deletes it (ruling if needed).
- [ ] Run the legal api and schema tests → PASS. Commit `feat(legal): Change feed reads kinds, descriptions`.

### Task 2: Address — keys and old links

**Files:** Modify `src/schemas/legal-search.ts` (`legalChangesSearchSchema`), `src/routes/legislation/changes.tsx`; create `src/features/legal/lib/legal-changes-address.ts` + test; route redirect test in `src/routes/legislation/-retired-redirects.test.ts` (or a new `-changes-redirects.test.ts`).

**Interfaces — Produces:**
- `type ChangesTab = 'schimbari' | 'legi-noi' | 'fara-data'`
- `type ChangesState = { tab: ChangesTab; kinds: readonly LegalEventKind[]; since: string | null; until: string | null }`
- `changesStateOf(search: LegalChangesSearch): ChangesState` and `changesSearchOf(state: ChangesState): LegalChangesSearch` (round-trip; default tab and empty values absent)
- `changesSearchOfOld(search: Record<string, unknown>): Record<string, string> | null` (null when no old key is present)

- [ ] Tests first: `reads fila, fel, de, pana`; `drops unknown kinds and bad dates`; `round-trips every state`; `forwards an undated view without its window`; `forwards kind=promulgare to the new-laws tab`; `drops source and view=viitoare`; `keeps lang`; the route test: `/legislation/changes?view=nedatate&since=2026-01-01` → 301 to `/legislation/changes?fila=fara-data`. Run → FAIL.
- [ ] Implement; `beforeLoad` throws `redirect({ to: '/legislation/changes', search, replace: true, statusCode: 301 })` when `changesSearchOfOld` is not null; `yarn router:generate` only if the route file's shape needs it.
- [ ] Run → PASS. Commit `feat(legal): Changes page address keys`.

### Task 3: Model into the feature

**Files:** Create `src/features/legal/lib/legal-changes-blocks.ts` + test — the prototype's `changes.model.ts` and `narrowKinds`, typed on `LegalRecentChange` / `LegalEventKind`.

- [ ] Move the prototype's model tests first (they fail on the missing module), add `never sends an empty kinds list`; implement by moving the code; PASS. Commit with Task 4.

### Task 4: The page

**Files:** Create `src/features/legal/components/changes/legislation-changes-page.tsx` (tabs, upcoming, list, paging, counts), `legislation-changes-blocks.tsx` (`ChangeBlocks`, `ChangeRows`, the skeleton), `legislation-changes-panel.tsx` (the sheet, the active chips) + tests; modify `src/routes/legislation/changes.lazy.tsx`, `src/routes/legislation/changes.tsx` (head text if it names the sources); delete `legislation-changes-feed.tsx`, its test and `legislation-changes-skeleton.tsx` if nothing else imports it.

**Interfaces — Consumes:** Tasks 1–3. State from `Route.useSearch()` through `changesStateOf`; every change navigates with `changesSearchOf` (`replace: true`).

- [ ] Tests first: the prototype's seven page tests on the route's search, plus `caps the range at today`, `follows the address` (rerender with another search → the other tab's reads), `writes the tab and kinds in the address`. Run → FAIL.
- [ ] Implement from the prototype (reads through `fetchRecentChangesPage` / `fetchRecentChangesCount`; no prototype import).
- [ ] Run the legal tests → PASS; `yarn run check` under the lock → 0. Commit `feat(legal): Promote the Modificări redesign`.

### Task 4b: The hub's recent-changes band

**Files:** Modify `src/features/legal/components/hub/legislation-hub-bands.tsx` and its test (`legislation-page.test.tsx` or the band's own).

- [ ] Test first: `the hub's changes band asks for changes to existing acts only` (both the page and the count calls carry `kinds: CHANGE_KINDS`). Run → FAIL.
- [ ] Implement: pass `kinds: [...CHANGE_KINDS]` to both calls; adjust the band's title/count words if they say „modificări" for all events; its link opens `/legislation/changes` (the default tab is the same cohort).
- [ ] Run → PASS. Commit with Task 4 or on its own: `feat(legal): Hub band shows changes to acts`.

### Task 5: Catalogues

- [ ] Note to root (and the sessions touching the catalogues) listing the new ids and the ids leaving with the old feed; then one extract on this branch; fill each new id by hand in ro and en (an English msgstr starts as the Romanian source); restore `admin.po`/`pnrr.po`. Commit `i18n(legal): Modificări redesign strings` with `--only src/locales/ro/messages.po src/locales/en/messages.po`.

### Task 6: Review and gates

- [ ] Codex round 1 on base..HEAD (brief: the spec, this plan's Review Focus, code-only); command list checked; fixes each with a test that failed first; round 2 if round 1 had real findings. The legislation session reads each fix.
- [ ] Look at it on :3012 (`/legislation/changes`, 1280 and 390 px; old links forwarded) and send the owner screenshots.
- [ ] Merge origin/dev in the merge worktree; gates as ci.yml's two steps; coordinator per-side check; pre-push note to root with the owner's push word (asked in the dialog when green).
