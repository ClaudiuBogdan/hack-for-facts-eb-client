# Transparenta.eu Design Foundation

This folder is the design handoff layer between UX research and UI implementation.
It turns the domain research in `docs/ux-research/` into build-ready decisions for
React 19, TypeScript, TanStack Router, shadcn/ui, and Tailwind v4 implementation
agents.

## Handoff Contract

- Fact: UX source documents remain unchanged. Domain design docs consume them but
  do not rewrite them.
- Fact: Client implementation is mock-first when production APIs are absent.
  Mock data must be shaped like the scraper/source contracts so API integration
  later happens in feature API adapters, not by rebuilding UI.
- Decision: Every domain folder contains `ux.md`, `design.md`, and one
  `features/<feature-slug>.md` file per specialized implementation unit.
- Decision: Each feature file must be self-sufficient for an implementation
  subagent. It must decide route, URL state, layout, components, data contract,
  interactions, loading/error/empty states, privacy/provenance behavior, i18n,
  accessibility, acceptance checks, and non-goals.
- Decision: Every nontrivial design statement is labeled as `Fact`, `Decision`,
  or `Assumption`.
- Decision: Open questions are only true blockers. Preferences, visual choices,
  and normal implementation details must be decided in the document.
- Assumption: Romanian is the primary production language, with English support
  through existing Lingui catalogs.

## Shared Product Principles

- Decision: Build investigative work surfaces, not marketing pages. Use dense,
  scannable layouts with restrained visual hierarchy and direct actions.
- Decision: Prefer lists, tables, maps, timelines, evidence panels, and
  entity-centric profiles over decorative dashboards.
- Decision: Page sections are full-width bands or unframed constrained layouts.
  Cards are reserved for repeated records, modals, and genuinely framed tools.
- Decision: Do not nest cards inside cards.
- Decision: Use border radii of 8px or less unless an existing shadcn component
  enforces a different local style.
- Decision: Use color to encode status only when the same meaning is also
  available through text, icon, or position.
- Decision: Use compact typography for operational surfaces. Reserve large type
  for first-level page titles only.
- Decision: No gradient-orb, bokeh, decorative blob, or stock-style atmosphere
  backgrounds.
- Decision: Each domain must expose source coverage, freshness, and data limits
  near the primary result, not hidden in documentation.

## Route Strategy

- Fact: Existing client routes already include `/entities/$cui`, `/companies/$cui`,
  `/parlament`, `/pnrr`, `/primarie`, `/maps`, and `/budget-explorer`.
- Fact: Existing global search result routing sends private companies to
  `/companies/$cui`, generic organizations/public enterprises/NGOs to
  `/entities/$cui`, parliament members to `/parlament/membri/$id`, and bills to
  `/parlament/proiecte/$id`.
- Decision: Keep `/entities/$cui` as the shared CUI spine for cross-domain
  institution context.
- Decision: Keep `/companies/$cui` as the private-company profile route.
- Decision: Add domain routes only where a domain needs a distinct task surface:
  `/achizitii`, `/legislatie`, `/justitie`, `/intreprinderi-publice`, `/alegeri`,
  `/investitii-publice`, `/ong-uri`, and `/statistici`.
- Decision: Domain entity profiles use explicit domain routes when the profile
  is meaningfully different from the generic CUI page:
  `/intreprinderi-publice/$cui`, `/ong-uri/$cui`, and
  `/investitii-publice/obiective/$id`.
- Decision: Cross-domain links should preserve the user's current context by
  using query parameters such as `from`, `county`, `year`, `source`, and
  `highlight` when they materially improve backtracking.
- Decision: Shareable filters, tabs, selected geography, sort order, and
  comparison state belong in TanStack Router search params.
- Decision: Ephemeral UI state such as an open popover, tooltip, or temporary
  hover remains local component state.
- Decision: Use Romanian path slugs for public-facing domain names when they are
  stable and understandable. Keep existing English technical routes where
  already shipped.

## Shared URL State

- Decision: Use predictable query parameter names across domains:
  `q`, `county`, `locality`, `year`, `period`, `source`, `status`, `type`,
  `sort`, `view`, `tab`, `page`, `pageSize`, `selected`, and `compare`.
- Decision: Multi-value filters use repeated values or comma-separated strings
  consistently per route parser; implementation agents must follow the local
  route validation pattern already used in entity and company pages.
- Decision: Default views must render without query parameters.
- Decision: Error recovery should leave the URL intact unless the URL is
  invalid. Invalid search params should be normalized by route validation, not by
  ad hoc component effects.

## Shared Components And Patterns

- Fact: Existing reusable UI includes shadcn/Radix primitives in
  `src/components/ui`, entity profile patterns under `src/components/entities`,
  filter components under `src/components/filters`, tables under
  `src/components/tables`, maps under `src/components/maps`, charts under
  `src/components/charts`, and budget visualization under
  `src/components/budget-explorer`.
- Decision: Use existing shadcn primitives before introducing feature-specific
  components.
- Decision: Prefer `Button`, `Badge`, `Tabs`, `Table`, `Sheet`, `Dialog`,
  `Tooltip`, `Select`, `MultiSelect`, `EmptyState`, and existing filter tags for
  domain surfaces.
- Decision: Use lucide icons in icon buttons and status labels when an icon is
  needed.
- Decision: New cross-domain components should be proposed only when at least
  two domains need the same pattern.

Shared components to standardize:

- `CoverageRibbon`: compact page-level source/freshness/known-gap summary.
- `DataStatusBadge`: `live`, `mock`, `partial`, `stale`, `blocked`, or
  `unverified` state.
- `SourceProvenanceDrawer`: source URL, collector/scraper reference,
  retrieval/publication dates, parser notes, and known caveats.
- `EvidenceLink`: inline link to a document, monitor/publication entry, source
  row, or scraper reference.
- `FreshnessBadge`: human-readable `actualizat la`, `publicat la`, or
  `date pana la`.
- `IdentityConfidenceBadge`: high/medium/low identity certainty with concise
  explanation.
- `PrivacyBoundaryNotice`: explains why sensitive records are aggregated,
  redacted, or not shown.
- `ReviewSignalBadge`: neutral signal indicator for procurement/legal/justice
  review patterns. It must not imply wrongdoing.
- `RelatedLinksRail`: narrow cross-domain links for the current entity,
  geography, source, or record.
- `MapListSync`: synchronized map and result list pattern for geography-heavy
  domains.
- `ShareFilteredView`: copy-current-view affordance for filtered investigative
  states.
- `RequestDatasetAction`: call to request missing or blocked public data.

## Visual System

- Decision: Use Tailwind utility classes and existing tokens. Do not add global
  CSS for these documents' recommendations unless implementation later proves a
  shared token gap.
- Decision: Use neutral backgrounds, subtle borders, and status accents. Avoid
  one-hue palettes per page.
- Decision: Use tables for precise comparison, lists for investigative scanning,
  maps for geographic distribution, and timelines for lifecycle/order.
- Decision: Use compact, sticky filter bars on list-heavy pages when the main
  action is repeated filtering.
- Decision: Keep destructive or risk-heavy actions out of these public-data
  surfaces unless implementation has an explicit product requirement.
- Decision: Use skeletons for known layout loading and `EmptyState` for
  meaningful no-results/no-coverage states.

## Accessibility

- Fact: The client uses Radix primitives through shadcn components for many
  accessible interactions.
- Decision: All controls must be keyboard reachable and labelled.
- Decision: Tables must preserve semantic table markup and include descriptive
  column headings.
- Decision: Charts and maps need adjacent textual summaries and tabular fallbacks
  for key values.
- Decision: Badges cannot be the only way to communicate state.
- Decision: Tooltips explain compact controls but never contain the only critical
  information.
- Decision: Sheets and dialogs require focus management, clear headings, and
  close controls.

## Internationalization

- Fact: The client uses Lingui with Romanian and English catalogs.
- Decision: All user-facing implementation text must use Lingui macros.
- Decision: Dates, numbers, money, percentages, vote counts, and ranks must use
  locale-aware formatting.
- Decision: Feature documents should write primary labels in Romanian and may add
  English clarifications only when useful for implementers.
- Decision: Do not hard-code legal or administrative acronyms without first
  expanding them in visible context or a tooltip.

## Data Provenance And Privacy

- Decision: Every domain page that shows source-derived data must expose source,
  publication/retrieval date when available, and confidence/coverage caveats.
- Decision: Do not invent derived accusations. Use language such as `semnal`,
  `necesita verificare`, `diferenta`, `concentrare`, or `necorelare`, not
  wrongdoing labels.
- Decision: Justice records and NGO identity records must be especially careful:
  show public-entity and institutional insights first, redact or aggregate where
  individual exposure is not essential, and explain the boundary.
- Decision: If a source is name-only, indirect, partial, or unverified, the UI
  must say so at the point of use.
- Decision: Cross-domain joins are evidence-led. The UI must show why two
  records are connected, especially when CUI, source IDs, or dates are missing.

## Mock-First Data Contract

- Fact: The client has mock-first development guidance in
  `docs/mock-first-ui-development.md` when present locally, plus typed scraper
  references under `src/lib/scraper-references/`.
- Decision: Each feature file must define the mock data shape at the UI boundary:
  IDs, labels, numeric fields, dates, source metadata, confidence fields, and
  null/unknown handling.
- Decision: Feature API adapters should live under the relevant
  `src/features/<feature>/api` area during implementation, with mocks under the
  same feature module.
- Decision: Mock values can demonstrate states, but docs must distinguish mock
  examples from source facts.
- Decision: If a UI decision depends on an exact scraper field that is not in
  the UX document, mark it as an assumption or verify it against the scraper
  project before treating it as fact.

## Domain Output Template

Each `docs/design/<domain>/ux.md` should contain:

- Source UX document path.
- One-paragraph product intent.
- User roles and top jobs.
- MVP scope.
- High-value next scope.
- Source/data constraints.
- Privacy/provenance constraints.
- Design implications.
- Blockers only.

Each `docs/design/<domain>/design.md` should contain:

- Domain purpose and scope.
- High-level design patterns.
- Information architecture and routes.
- Shared layout and navigation decisions.
- Domain components and reuse plan.
- Data model expectations at the UI boundary.
- Feature implementation map.
- Responsive behavior.
- Accessibility, i18n, privacy, and provenance.
- Acceptance criteria.
- Open questions: blockers only.

Each `docs/design/<domain>/features/<feature-slug>.md` should contain:

- Feature owner profile: the specialized implementation subagent type.
- Feature summary.
- Facts, decisions, and assumptions.
- Route and URL state.
- Data contract and mock states.
- UI structure.
- Component reuse and proposed new components.
- Interactions.
- Loading, empty, error, partial, and stale states.
- Accessibility and i18n requirements.
- Privacy, provenance, and source-citation behavior.
- Acceptance checklist.
- Non-goals.
- Open questions: blockers only.

## Implementation Handoff Rules

- Decision: Implementation subagents should use the feature file as the primary
  design source and the original UX doc only for traceability.
- Decision: If implementation discovers a design gap, it should update the
  relevant design/feature doc before coding the changed behavior.
- Decision: When a feature file leaves a visual or structural choice open,
  prototype the candidates at `/development/*` (see
  [`prototyping.md`](prototyping.md)) and record the outcome in the feature file.
- Decision: Implementation should not add broad new route or component concepts
  that contradict this foundation without product-owner review.
- Decision: Domain feature files are ordered MVP first, then high-value next.
- Decision: Domain docs must name reusable patterns rather than leaving
  implementers to infer them from screenshots or prose.

## Quality Bar

- Decision: A design file is complete only when an implementation subagent can
  start without asking what route, components, states, interactions, or copy
  hierarchy should be.
- Decision: A design file is incomplete if it says only `use a dashboard`,
  `show charts`, `add filters`, or `link sources` without specifying concrete
  behavior.
- Decision: A design file must preserve uncertainty honestly. Unknown source
  coverage, weak joins, and partial datasets are product states, not footnotes.
