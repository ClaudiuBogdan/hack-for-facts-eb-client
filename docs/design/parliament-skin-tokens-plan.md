# Parliament's skin as named tokens: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** every colour in `src/features/parliament` comes from a named `parliament-*` token whose dark value lives in
the token. Light mode is unchanged apart from the listed near-duplicates. Dark mode reads everywhere. Parliament no
longer references `--pnrr-*`.

**Architecture:** tokens are hex CSS variables `--parliament-<slot>` in the `:root` and `.dark` blocks of
`src/index.css`, exposed in `tailwind.config.js` as `parliament.<slot>: "var(--parliament-<slot>)"`. They are not
HSL triples: hex keeps the light values exact, and Tailwind v4 mixes opacity steps with `color-mix()`. A test
measures the tokens. The palette guard gains parliament with a `PENDING` list that each batch shortens. Files are
converted by the mapping table below, in five batches. Each batch is checked by a light pixel comparison and a dark
contrast sweep against a build of the pre-change commit.

**Tech Stack:** Tailwind v4 (`@config`), React 19, Vitest, Playwright for the screens, `@tailwindcss/node` for the
size measurement.

**Spec:** [parliament-skin-tokens.md](parliament-skin-tokens.md)

## Global Constraints

- **The token values** (light / dark), from the spec and its answers:

  | Slot | Light | Dark | Slot | Light | Dark |
  |---|---|---|---|---|---|
  | `fg` | `#0b0c0c` | `#f7f7f2` | `link` | `#1d70b8` | `#94c1ea` |
  | `muted` | `#505a5f` | `#a8aaa3` | `link-hover` | `#003078` | `#b3d3f2` |
  | `border` | `#b1b4b6` | `#e7e7dc` | `action` | `#1d70b8` | `#1d70b8` |
  | `border-strong` | `#1f1f1f` | `#e7e7dc` | `ink` | `#0b0c0c` | `#0b0c0c` |
  | `card` | `#ffffff` | `#1b1f1c` | `icon` | `#372554` | `#372554` |
  | `surface` | `#f3f2f1` | `#30362f` | `resource` | `#512178` | `#c4a7e7` |
  | `hover` | `#f8f8f8` | `#262b27` | `commons` | `#006435` | `#58b083` |
  | `page` | `#fafaf8` | `#111412` | `senate` | `#9c051a` | `#ef8a9a` |
  | `frame-fg` | `#1f1f1f` | `#f7f7f2` | `success` | `#00703c` | `#85c99b` |
  | `frame-muted` | `#6f6f6f` | `#a8aaa3` | `error` | `#d4351c` | `#f4a196` |
  | `frame-subtle` | `#e7e7e3` | `#30362f` | `focus` | `#3b82f6` | `#60a5fa` |
  | `frame-hover` | `#f0f0ec` | `#262b27` | `accent` | `#b6ff00` | `#b6ff00` |

  The ramp and initials slots:

  | Slot | Light | Dark |
  |---|---|---|
  | `commons-fill`, `senate-fill`, `resource-fill` | `#006435`, `#9c051a`, `#512178` | the same (they do not flip) |
  | `ramp-1` … `ramp-4` | `#d2e2f1` `#a3c6e3` `#5e94c9` `#1d70b8` | `#4d7299` `#6290c0` `#86b3e0` `#c0dcf7` |
  | `ramp-0` (empty cell), `ramp-edge` (cell edge) | `#f3f2f1`, `#e5e5e0` | `#2a302a`, `#e7e7dc` |
  | `accent-fg` (text on the lime chip) | `#1f1f1f` | `#1f1f1f` |
  | `resource-heading`, `bill-heading` | `#372554`, `#121847` | `#f7f7f2`, `#f7f7f2` |
  | `conflict` | `#912b88` | `#d8a3d0` |
  | `notice`, `notice-fg`, `notice-edge` (stenogram notice) | `#fdf3e3`, `#6b4a08`, `#b58840` | `#30362f`, `#f7f7f2`, `#e7e7dc` |
  | `highlight` (on the `ink` tooltip) | `#ffdd00` | `#ffdd00` |
  | `inactive` (vacant seat, legend bar) | `#c5c7c9` | `#8f958f` |
  | `accent-focus` (focus ring on the lime chip) | `#3b82f6` | `#1d4ed8` |
  | `abstain`, `faint` (vote-table figures, zero counts) | `#f47738`, `#b1b4b6` | `#f8a26c`, `#a8aaa3` |
  | `initials-1` … `initials-4` | `#f3f2f1` `#ede7f6` `#e8f5e9` `#fff3e0` | `#30362f` `#33293f` `#22352a` `#3d3122` |

- **Mapping.** One class per use. Each `dark:` colour partner is deleted, not translated.

  | Today | Becomes |
  |---|---|
  | `[#0b0c0c]` | `parliament-fg` |
  | `[#505a5f]` | `parliament-muted` |
  | `[#b1b4b6]` | `parliament-border` |
  | `[#f3f2f1]` | `parliament-surface` |
  | `[#f8f8f8]` | `parliament-hover` |
  | `[#1d70b8]` as text, border or ring | `parliament-link` |
  | `[#1d70b8]` as a solid fill under white text | `parliament-action` |
  | `[#0b0c0c]` as a solid fill under white text | `parliament-ink` |
  | `[#003078]` | `parliament-link-hover` |
  | `[#512178]` as text | `parliament-resource` |
  | `[#372554]` as text | `parliament-resource-heading` |
  | `[#372554]` as a fill | `parliament-icon` |
  | `[#006435]` as text | `parliament-commons` |
  | `[#006435]` as a fill, accent bar or rule | `parliament-commons-fill` |
  | `[#9c051a]` as text | `parliament-senate` |
  | `[#9c051a]` as a fill, accent bar or rule | `parliament-senate-fill` |
  | `[#512178]` as a fill, accent bar or rule | `parliament-resource-fill` |
  | `[#00703c]` | `parliament-success` |
  | `[#d4351c]` | `parliament-error` |
  | `bg-white` paired with a dark card | `parliament-card` |
  | `[var(--pnrr-fg)]` | `parliament-frame-fg` |
  | `[var(--pnrr-muted)]` | `parliament-frame-muted` |
  | `[var(--pnrr-border)]` | `parliament-border-strong` |
  | `[var(--pnrr-card)]` | `parliament-card` |
  | `[var(--pnrr-bg)]` | `parliament-page` |
  | `[var(--pnrr-subtle)]` | `parliament-frame-subtle` |
  | `[var(--pnrr-hover)]` | `parliament-frame-hover` |
  | `[var(--pnrr-blue)]` | `parliament-focus` |
  | `[var(--pnrr-green)]` | `parliament-accent` |
  | undefined `[var(--pnrr-surface)]`, `[var(--pnrr-text)]` (`dark:` only) | dropped; they never applied, and the light class's token carries dark |

  - **Hex in brackets.** Inside a bracket (`shadow-[inset_0_-2px_0_0_#b1b4b6]`), the hex becomes
    `var(--parliament-<slot>)`. An opacity step keeps its number (`[#1d70b8]/5` → `parliament-link/5`).
  - **Near-duplicates:** the spec's list. Each is recorded in the ledger with its before and after colour.
  - **Where light and dark differ today.** A light class whose dark partner is a different role (for example
    `text-[#512178] dark:text-[var(--pnrr-fg)]`) takes its light role's token. The dark change is noted in the
    ledger.
- **Party colours** (`chamber-composition.ts`, hemicycle seats, party chart, members table, legend) stay hex. No class
  name is built at runtime.
- **Light is a hard gate.** The light pixel comparison must show zero difference outside the near-duplicate spots in
  the ledger.
- **Dark text passes AA.** In dark, every text node measures ≥ 4.5:1 against its composited background (3:1 for
  large text, and for borders that are a control's only boundary).
- **Nothing else changes:** behaviour, layout and copy stay the same. A test's class assertions change only where they
  asserted a hex or `--pnrr-*` class.
- **Each batch** runs `yarn run check`, the parliament tests, the screens, and an Astra review (`gpt-6.2-astra`:
  `max` for Task 1, `xhigh` for batches), then commits locally on `dev`. No push without the owner. No AI-attribution
  trailers. Prettier only on new files (`--no-semi --single-quote --print-width 180`).

## Review Focus

1. **A `dark:` partner deleted where the light class's token has a different dark value than today.** Example:
   resource headings that are near-white in dark today. The dark screens must be looked at, not only measured.
2. **`bg-white` or `bg-[#…]` with no dark partner sitting inside a dark card.** After conversion a white card turns
   dark, so any hard-coded `text-white` or `text-black` inside it must be a token. The dark sweep catches these, and
   each batch greps its files for `text-black`, `bg-white` and `text-white` outside `action`, `ink` and `icon` fills.
3. **Inline styles fed from `hub-theme.ts` constants:** hemicycle, bar markers and accent borders. A `var()` string
   must resolve where it is used. jsdom cannot resolve the stylesheet's variables, so the unit tests assert the
   token on the right property, and the light pixel comparison of the hero pages is the rendered check.
4. **Focus rings and hover states.** They are not in a static screenshot, so the screens tab through the first
   interactive elements and hover one card per page.
5. **The landing page's `ParliamentPromoCard`** is converted in Batch A, and the landing page is in the screen set.

---

### Task 1: the tokens exist, measured

**Files:**
- Modify `src/index.css`: `:root` (beside `--pnrr-*`, line ≈142) and `.dark` (line ≈228).
- Modify `tailwind.config.js`: `colors.parliament`, a nested object whose `frame`, `ramp` and `initials` are objects.
- Modify `src/features/parliament/lib/hub-theme.ts`: each constant becomes `'var(--parliament-<slot>)'`.
- Create `src/styles/parliament-tokens.test.ts`.

**Interfaces:**
- Produces the classes `{bg,text,border,ring,divide,fill,stroke,decoration,outline}-parliament-<slot>[/<n>]`, with
  `<slot>` as in the Global Constraints (`frame-fg` → `text-parliament-frame-fg`, `ramp-1` → `bg-parliament-ramp-1`).
- `hub-theme.ts` constants keep their names and now hold `var()` strings.
  - `PARLIAMENT_CAMERA_GREEN`, `PARLIAMENT_SENAT_RED` and `PARLIAMENT_RESOURCE_PURPLE` are the non-flipping
    `*-fill` slots, for heroes, bars and rules.
  - A text use of one of them moves to the flipping class in its batch.

- [ ] **Step 1: failing test.** `parliament-tokens.test.ts` reuses `design-tokens.test.ts`'s approach: compile
  `src/index.css` with `@tailwindcss/node`, parse with postcss, and replay `:root` and `.dark` in source order. It
  asserts:
  - (a) every slot's light and dark value equals the table;
  - (b) dark contrast ≥ 4.5:1 for `fg`, `muted`, `link`, `link-hover`, `resource`, `commons`, `senate`, `success`,
    `error`, `frame-fg` and `frame-muted` on `page`, `card`, `hover` and `surface`;
  - (c) white text on `action`, `ink` and `icon` ≥ 4.5:1;
  - (d) the light contrast of the same text pairs is reported, and asserted only for pairs that pass today, so a known
    light failure (`error` on `surface`, 4.34:1) is pinned rather than hidden;
  - (e) `text-parliament-fg`, `bg-parliament-ramp-3` and `bg-parliament-link/5` emit CSS, the last through
    `color-mix`;
  - (f) no `--parliament-*` declaration is `!important` or under a media/supports condition.
- [ ] **Step 2:** `npx vitest run src/styles/parliament-tokens.test.ts` → FAIL (no tokens).
- [ ] **Step 3:** add the variables, the config colours and the `hub-theme.ts` constants.
- [ ] **Step 4:** the test passes. `npx vitest run src/features/parliament` stays green: a test asserting a constant's
  hex is updated to the `var()` string. `yarn run check` passes.
- [ ] **Step 5:** Astra (max) reviews the token set, its dark values and the test. Fix, then commit
  `feat(parliament): Define the parliament skin as named light and dark tokens`.

### Task 2: the guard covers parliament

**Files:** Modify `src/styles/raw-palette-guard.test.ts`.

- [ ] **Step 1:** add `src/features/parliament` to `GUARDED`. Add a `PNRR_VAR` rule (`var(--pnrr-` inside a class
  bracket) that applies to parliament. The existing arbitrary-value check already rejects hex, `rgb()` and `hsl()` in
  brackets and allows `var(--parliament-…)`. The hex-in-code check stays learning-only (party colours).
- [ ] **Step 2:** fixtures: `text-[#0b0c0c]` caught; `dark:border-[var(--pnrr-border)]` caught;
  `shadow-[inset_0_-2px_0_0_var(--parliament-border)]` allowed; `const PSD = '#e4002b'` in a `.ts` file under
  parliament allowed.
- [ ] **Step 3:** list today's offending parliament files in `PENDING_PARLIAMENT` (99 or so, generated by the test's
  own finder and pasted sorted). The guard skips them and fails if a listed file is already clean, so the list can
  only shrink.
- [ ] **Step 4:** the guard passes; `yarn run check`; Astra (xhigh); commit `test(design): Guard parliament against
  hex and PNRR colours in classes`.

### Task 3: the screens

**Files:** create scratch tools in `.superpowers/sdd/parliament-skin-tokens-plan/` (gitignored; not committed).

- [ ] **Step 1: the baseline.** A worktree of the Task 1 parent commit in `~/projects/worktrees/hff-parliament-base`,
  with node_modules hardlinked as last time, served on :3021 in `chronos-server` mode. The working tree is served on
  :3000.
- [ ] **Step 2: `screens.mjs <name>`.** Playwright visits the routes against both ports in turn, with the theme set
  by the `ui-theme` cookie, at 390 and 1440 px. Each pair is taken back to back so the API data match.
  - The routes: `/parlament`, `/parlament/voturi` and the first vote, `/parlament/proiecte` and the first bill (each
    tab), `/parlament/membri` and the first member (each tab), `/parlament/grupuri` and the first group,
    `/parlament/comisii` and the first committee, `/parlament/agenda`, `/parlament/stenograme` and the first
    stenogram, a not-found URL, and `/` (the promo card).
  - Light: a per-pixel diff of each pair, saving a diff image when any pixel differs, with relative-time text masked.
  - Dark: every text node's contrast against its composited background on :3000, listing anything under the
    threshold.
  - After each full-page shot it tabs to the first three focusables and hovers the first card, shooting both.
- [ ] **Step 3:** run it before any conversion. Light must show zero difference, since Task 1 only added tokens. Save
  the dark baseline list as the "known failures" the batches must clear.

### Tasks 4–8: conversion batches

Each batch converts its files by the mapping, removes them from `PENDING_PARLIAMENT`, runs the tests, `yarn run
check` and `screens.mjs`, gets an Astra (xhigh) review and its fixes, and commits `refactor(parliament): …`. A light
difference outside the ledger stops the batch.

| Task | Batch | Files |
|---|---|---|
| 4 | A: shared | `lib/*-theme.ts` (11), `parliament-promo-card.tsx`, page frame, back link, tab nav, section and skeleton components |
| 5 | B: hub and votes | `parliament-hub-*`, `vote-*`, `votes-*`, the heat maps |
| 6 | C: bills | `bill-*` |
| 7 | D: members and groups | `member-*`, `members-*`, `group-*`, `groups-*`, `party-*`, `speech-*`, `chamber-*` |
| 8 | E: the rest | committees, agenda, stenograms, `year-*`, error, not-found and load-error pages, anything left in `PENDING_PARLIAMENT` |

After Task 8, `PENDING_PARLIAMENT` is empty and deleted, and the dark sweep lists nothing.

### Task 9: measure, review, record

- [ ] **Step 1:** `DETAIL=src:features/parliament node docs/performance/2026-11-17-landing/tools/css-attribution.mjs`
  and the plain totals, compared with the baseline: shipped 438,780 bytes, parliament 21,707.
- [ ] **Step 2:** functional pass. On both ports, click each list page's filters, tabs and first links, and compare
  outcomes and console errors.
- [ ] **Step 3:** Astra (max) reviews the whole change; fix its findings in a final wave.
- [ ] **Step 4: record.**
  - Add a Results section to the spec: size, the near-duplicate ledger with before and after colours, dark fixes and
    what was not driven.
  - Add a DESIGN.md decision log entry, and update the Reference Patterns paragraph that names PNRR's tokens for
    parliament.
  - Record the legal theme as a follow-up.
- [ ] **Step 5:** commit. Ask the owner before pushing (publish by merge, with the pre-push notice to root).
