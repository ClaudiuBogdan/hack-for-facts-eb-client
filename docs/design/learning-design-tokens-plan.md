# Learning, campaigns and challenges on the design tokens: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** no raw Tailwind palette colour left in learning, campaigns, challenges or the one lesson pair; the status
tokens DESIGN.md defines exist in code.

**Architecture:** status tokens are added the way every token here is: HSL triples on `:root` and `.dark` in
`src/index.css`, exposed as `hsl(var(--…))` colours in `tailwind.config.js`. Two tests in `src/styles/` hold the
system: one measures the status pairs' contrast from `src/index.css`, one fails on raw palette classes in the scoped
folders, with a `PENDING` list of not-yet-converted files that each batch shortens. Files are converted by meaning
per the design's mapping table, in batches, each checked by screenshots before and after.

**Tech Stack:** Tailwind v4 (with `@config`), React 19, Vitest, Playwright (screens), Lingui untouched.

**Spec:** [learning-design-tokens.md](learning-design-tokens.md)

## Global Constraints

- Mapping by meaning, per the spec's table: neutrals → `background/card/muted/border/foreground/muted-foreground`;
  blue/indigo/violet/purple/teal/sky → `primary`; emerald/green → `status-live-*`; amber/orange/yellow →
  `status-partial-*`; red/rose → `status-blocked-*`; categories → `chart-1…4` fills only; no `dark:` colour variants.
- Tint opacity steps only `/10 /20 /30 /40 /50`. Text never takes `chart-N`. No class name built at runtime.
- Status light values exactly DESIGN.md's: live `142 60% 94%` / `142 70% 25%`; mock `0 0% 95%` / `0 0% 25%`;
  partial `35 90% 93%` / `28 90% 28%`; blocked `0 80% 96%` / `0 72% 38%`. Dark: same hue, inverted lightness.
- Contrast ≥ 4.5:1 for each `-fg` on its `-bg`, on `--card` and on `--background`, in both themes.
- Nothing about a component's behaviour, layout, copy or tests' behaviour changes; class-string assertions in tests
  change only where they asserted the old palette class.
- Each batch: screenshots before/after (light + dark, 390 + 1440 px), `yarn run check`, the batch's tests, an Astra
  review (`gpt-6.2-astra`; `max` for Task 1, `xhigh` for batches), then a local commit on `dev`. No push without the owner.
- No AI-attribution trailers. Prettier only on new files (`--no-semi --single-quote --print-width 180`).

## Review Focus

1. Dark mode on a converted lesson: a former `dark:` override removed, so the token must be right in dark on its own
   (screens in dark for every batch).
2. Meaning by hue alone after conversion (correct vs wrong answer, surplus vs deficit): each must keep an icon or word;
   check in each batch's screens and the Task 6 lesson pair.
3. A selected or active state that used one hue against siblings in another: both may now map to neutrals; selection
   must stay visible (`primary` border/ring).
4. Charts with more than four categories: `chart-1…4` repeat; the legend or label must stay next to each.
5. A data file whose class strings are consumed by a component in another folder (campaigns using learning data):
   the guard covers both, and the screen set includes the consumer.

---

### Task 1: the status tokens exist, measured

**Files:** Modify `src/index.css` (`:root` block from line 44, `.dark` block from line 149), `tailwind.config.js`
(`colors`, beside `choropleth`). Create `src/styles/design-tokens.test.ts`.

**Interfaces:** Produces Tailwind colours `status-{live,mock,partial,blocked}-{bg,fg}` (classes such as
`bg-status-live-bg`, `text-status-blocked-fg`, `bg-status-live-fg` for solid fills).

- [ ] **Step 1: failing test** `design-tokens.test.ts` reads `src/index.css`, parses the `:root` and `.dark` blocks'
  `--name: H S% L%;` triples, and asserts for each status state and both themes:
  `contrast(fg, bg) >= 4.5`, `contrast(fg, card) >= 4.5`, `contrast(fg, background) >= 4.5`; and that the light
  values equal the Global Constraints' numbers. WCAG relative luminance from HSL → sRGB.
- [ ] **Step 2:** `npx vitest run src/styles/design-tokens.test.ts` → FAIL (tokens missing).
- [ ] **Step 3:** add `--status-*-bg/fg` to both blocks (dark values chosen to pass the test: bg lightness ≈12–18%,
  fg ≈70–80%, same hue) and the `status` colours to `tailwind.config.js` (`status: { live: { bg: …, fg: … }, … }`
  producing `status-live-bg`), and a line for each in DESIGN.md's token YAML for dark if it lists dark values.
- [ ] **Step 4:** test passes; compile check: `bg-status-partial-bg` now generates CSS.
- [ ] **Step 5:** screens of the three existing users (justice source line, justice case page, company main
  activity) light/dark; Astra max review; commit `feat(design): Define the status tokens DESIGN.md describes`.

### Task 2: the guard, the baseline, the measuring tool

**Files:** Create `src/styles/raw-palette-guard.test.ts`; move the attribution script to
`docs/performance/2026-11-17-landing/tools/css-attribution.mjs` (usage line at top; `DETAIL=<area>` mode).

**Interfaces:** Produces `PENDING: readonly string[]` (repo-relative paths) in the guard; each later task removes its
files from it.

- [ ] **Step 1: tests** in the guard: (a) "no raw palette colour outside PENDING": every `.ts/.tsx/.mdx/.md` under
  `src/features/{learning,campaigns,challenges}` and `src/content/learning` not in `PENDING` has no match for the
  spec's class pattern, and no hex colour literal in `src/features/learning`'s `.ts/.tsx` (the owner's ruling: map
  paint in campaigns and challenges keeps its colour strings); failure message lists `file: class`.
  (b) "PENDING has no clean file": every `PENDING` entry still matches (so a converted file must leave the list).
- [ ] **Step 2:** run with `PENDING = []` → (a) fails listing 87 files; set `PENDING` to exactly those files → passes.
- [ ] **Step 3:** baseline: run `css-attribution.mjs` on this commit; record total minified size and each in-scope
  area's own bytes in the spec's Verification section. Commit `test(design): Guard raw palette colours out of learning, campaigns and challenges`.

### Tasks 3–7: conversion batches

Each batch, same steps: take the files; capture before-screens (the routes that render them; for lesson components,
the lessons whose `.mdx` uses them, found by grep in `src/content/learning`); convert per the mapping; remove the
files from `PENDING`; run the guard, the batch's own tests and `yarn run check`; after-screens and a side-by-side
look; Astra xhigh review with the screens' paths; commit `refactor(<feature>): Draw <batch> with the design tokens`.

| Task | Files |
|---|---|
| 3 | learning: BudgetAllocatorGame, BudgetCycleTimeline, PhaseCards, PromiseTracker, SalaryTaxCalculator (+ their `*-data.ts`) |
| 4 | learning: the next fifteen by class count (UATFinder … VATCalculator, Quiz, lesson-player-shell) with their data files |
| 5 | learning: the remaining files (player, layout, cards, the rest of the interactive and data files) |
| 6 | lesson `local-national-budgets/02-local-government-structure/index.{en,ro}.mdx`: dots take tokens and each gets a word (or the table a legend), same meaning in both languages |
| 7 | challenges (9 files), then campaigns' reader pages, then campaigns' admin pages (28 files), as three commits if large |

- [ ] Per batch, the hue-only check (Review Focus 2) and the selection check (Review Focus 3) are part of the side-by-side look.

### Task 8: measure, review, record

- [ ] `PENDING` is empty; delete the "PENDING has no clean file" test's special case only if the list is gone.
- [ ] Re-run `css-attribution.mjs`; record before/after in the spec.
- [ ] Astra max review of the whole range; fix confirmed findings with a failing test or a screen.
- [ ] DESIGN.md decision log: "2026-11-20 — learning, campaigns and challenges follow the main system; status
  tokens implemented". Report to the owner; push only on their go.
