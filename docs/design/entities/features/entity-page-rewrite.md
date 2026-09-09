# Feature: Entity page rewrite (`/entities/$cui`)

**Status:** open — three variants built on 9 September 2026, decision pending ·
**Prototype:** `/development/entities/entity-page` (`yarn dev` only) ·
**Spec:** `docs/user-stories/entity-details.md`

The entity page is rebuilt in the visual language of the landing rewrite
(`/development/landing/home-refs`): a framed column with 1px side rules,
full-width bands between rules, numbered mono section rails, one accent colour,
borders instead of shadows, radius ≤ 8px. The landing's motion stack (scroll
light, scramble, count-up, pixel field) is deliberately not borrowed —
`DESIGN.md` §Motion allows arrival and orientation only on a work surface.

## What is being decided, in order

1. **The main layout** — stacked bands (`bands`) vs a desktop sticky rail (`rail`).
2. **The header** — shared by every variant: mono eyebrow (kind · county · CUI),
   the entity name at `text-3xl sm:text-4xl lg:text-5xl`, population and the
   county link, address, then the period picker, the Total / Pe locuitor toggle
   and the follow button, the provenance line, and the view rail whose active
   underline sits on the band's bottom rule. A compact bar (name · period · views)
   pins to the top once the hero scrolls out.
3. **The sections** — whether to rebuild them (`bands`, `rail`) or to keep the
   components the page has today inside the new shell (`keep`).

## Variants

| Key | Deep link | What it is |
|---|---|---|
| `bands` | `?v=bands` | One column in the landing rhythm: identity band, figures band (`dl` with four rule-separated cells), a desktop-only section index, then one band per section 02–07. Same DOM at every width. |
| `rail` | `?v=rail` | Above `lg`: identity, the four figures, the section index and the period pinned in a sticky left rail (4/12), sections scrolling on the right (8/12). Below `lg` it is `bands`, pixel for pixel — one DOM, arranged by breakpoints. |
| `keep` | `?v=keep` | The same shell, hero and compact bar, wrapping the components the entity page renders today: explainer, financial summary cards, trends chart, treemap + grouped line items (expenses, then income), category evolution, subordinates, reports, view navigator, FAQ. Nothing inside a reused component is restyled. |

Sections are the same seven in every variant, so compare mode lines up:
`01 Sinteză · 02 Structura cheltuielilor · 03 Structura veniturilor · 04 Evoluție ·
05 Instituții subordonate · 06 Rapoarte sursă · 07 Întrebări frecvente`.

URL state (`view`, `year`, `normalization`, `grouping`) is read with
`useSearch({ strict: false })` and written with `navigate({ to: '.', replace: true })`,
defaults dropped — the same contract the real route keeps in its search schema.

## Data

- **Fact:** the prototype renders `ENTITY_PAGE_FIXTURE` (Municipiul Cluj-Napoca,
  CUI 4305857). Identity, totals, population and the 2023–2025 trend are the
  recorded response in `tests/fixtures/entity-details-flow/`; line items,
  2021–2022, subordinates and reports are invented to be plausible in shape and
  derived from the recorded totals so the ledger sums to the headline.
- **Decision:** `source: 'local'` travels with the data and the hero shows the
  `date locale de test` badge (`DESIGN.md` §Mock-First Contract). The promoted
  page receives the same `EntityPageData` shape from the feature hooks and the
  badge disappears.
- **Fact:** in `keep`, two reused components fetch for themselves
  (`ChallengeEntityCategoryEvolution`, `ChallengeEntityReportsSection`). They
  render live and show their own loading or error state when the API is down.
  During the 9 September session both loaded live data in the browser while a
  `curl` to `localhost:3001` from the shell failed — the app targets the
  Tailscale hostname, not localhost.
- **Assumption:** the GraphQL API is not reliably running under the harness;
  that is why the page is fixture-driven. Swapping to the API is an adapter
  change in `features/entities`, not a UI change.

## Verified

- `yarn -s typecheck`, `eslint src/development/prototypes/entities --max-warnings=0`.
- SSR: `curl` of all three deep links answers 200 and carries the entity name,
  the section labels and the prototype marker.
- Screenshots at 1440×900, 390×844 and 360×800 for each variant
  (`/tmp/entity-redesign/v-*.png` on the machine that ran the session).

## Observations from the screenshots

- `bands` — the figures band and the ledger read fastest; at 390 wide the four
  figures fold to 2×2 and the ledger re-flows to two lines per row with no
  horizontal scroll. The compact bar leaves the phone's bottom dock alone.
- `rail` — desktop gains a persistent index and the figures stay in view, but the
  identity is said twice (hero and rail), the ledger drops to 8/12 of the frame,
  and the rail's sticky top has to negotiate with the app's own sticky elements.
  Below `lg` it is `bands`.
- `keep` — the shell and header carry the page on their own; the reused cards
  keep their 24–32px radii and shadows inside 8px-radius bands, and the treemap
  card title repeats the section rail's label. Category evolution and reports
  loaded live during the session.

## Recommendation (not yet decided)

Promote in two steps rather than pick one variant outright:

1. **Shell + header from `keep`** first. It changes no data contract, every
   existing component and its tests survive, and the page immediately gains the
   frame, the bands, the hero and the compact bar.
2. **Sections from `bands`** one at a time, each replacing its card: the figures
   band for the summary cards, the ledger for treemap + grouped items, then
   evolution, subordinates, reports, FAQ. Keep `rail` on file as the desktop
   arrangement to revisit once the sections are rebuilt.

## Known gaps before promotion

- Romanian-only strings; Lingui macros at promotion (prototypes are excluded
  from extraction).
- The follow button is a placeholder for `EntityNotificationBell`.
- Views other than `main-info` render a "not rebuilt here" band that links back.
- Per-capita in `keep` only relabels the reused components' options; the fixture
  amounts are totals. The rebuilt figures and ledger divide by population.
- The report period is a whole year; quarter and month selection from the real
  route's controls are not carried.
- The header's year list is the fixture's `availableYears`; picking a year the
  fixture does not cover shows the bare year, and in every variant the line
  items, treemap and ledger stay on the 2025 fixture — only the labels, the
  summary deltas and the trends follow the selected year.
