# Public Investments — Domain Design (Investiții Publice)

- Source UX: `docs/ux-research/public-investments.md`
- UX brief: `docs/design/public-investments/ux.md`
- Foundation: `docs/design/README.md`
- Tech: React 19 · TypeScript · TanStack Router (file routes) · TanStack Query ·
  shadcn/ui (Radix) · Tailwind v4 · Lingui · maplibre-gl (`InteractiveMap`).

This file sets the domain-wide patterns first, then the implementation
decisions every feature file relies on. Feature files in `features/*.md` are the
primary build source; they do not restate the shared shapes defined here, they
reference them.

---

## 1. Domain purpose and scope

Make 17,642 public-money objectives legible and verifiable. The objective is the
canonical hub; payments / contracts / stages / parties hang off it as
per-snapshot facts; `source_evidence` is the trust layer beneath every figure
(UX §7). Scope is the **four loaded programs** (Anghel Saligny, PNDL, PNCCRS,
PNMC). Out of scope for this domain: PNRR (lives in `/pnrr`), and any merged
money-flow modeling (see §9 guardrails).

---

## 2. High-level design patterns

- **Decision: Map + list is the spine.** Geography-heavy surfaces (landing,
  search, locality, county, analytics) use a synchronized map + result list
  (`MapListSync`). The map is the hook; the list is the work surface.
- **Decision: Objective-as-hub.** One detail page per `objectiveId`; everything
  about it is a tab or a section, never a separate page the user has to
  reassemble.
- **Decision: Every amount is guarded and cited.** No screen renders a bare
  number. The `AmountWithEvidence` pattern always carries (a) a PI-1 / precision
  guard state and (b) a "Vezi dovada" trigger. This is non-negotiable and is the
  domain's single most repeated component.
- **Decision: Honesty states are designed, not hidden.** Coverage gaps, PI-1
  inflation, money-precision anomaly, "no history yet", weak identity, gated
  parties, and dead/API source links each have an explicit, labeled UI. They are
  product states (foundation Quality Bar).
- **Decision: Plain Romanian first, expert depth behind disclosure.** Casual
  users get plain labels + a persistent "Cum citesc aceste date" explainer;
  experts get identity confidence, raw stage text, raw payload, and snapshot
  provenance behind "avansat"/disclosure affordances.
- **Decision: Investigative density, not dashboard decoration.** Dense scannable
  lists/tables, restrained hierarchy, status pills with text+icon, 8px grid,
  ≤8px radii, no decorative backgrounds (foundation Shared Product Principles +
  `advanced-map-analytics/DESIGN_PRINCIPLES.md`).

---

## 3. Information architecture and routes

Canonical routes (Decision — fixed by orchestrator; supersede UX §9 path
suggestions where they differ):

| Route | Purpose | Feature file |
|---|---|---|
| `/investitii-publice` | Landing + national objectives map | `objectives-map-landing.md` |
| `/investitii-publice/obiective/$id` | Objective detail hub | `objective-detail-hub.md` |
| `/investitii-publice/cautare` | Search + filterable map/list | `objectives-search-listing.md` |
| `/investitii-publice/localitati/$siruta` | Locality (UAT) territory page | `locality-county-page.md` |
| `/investitii-publice/judete/$countyCode` | County territory page | `locality-county-page.md` |

Domain routes required by assigned features but **not** in the orchestrator's
canonical five (Decision — additive, kebab-case Romanian, consistent with the
foundation's "add domain routes only where a domain needs a distinct task
surface"):

| Route | Purpose | Feature file |
|---|---|---|
| `/investitii-publice/firme` | Contractor / designer directory (privacy-gated) | `contractor-designer-directory.md` |
| `/investitii-publice/analiza` | Absorption analytics dashboard | `absorption-analytics-dashboard.md` |

Sub-surfaces that are **not** their own routes (Decision):

- **Evidence viewer** — a deep-linkable drawer (`SourceProvenanceDrawer`),
  opened from any "Vezi dovada" trigger via the `dovada` search param on the
  current route (see `evidence-viewer.md`). No standalone route; this keeps
  provenance reusable on every page and avoids inventing route segments.
- **Payments ledger** — the `Plăți` tab of objective detail
  (`?tab=plati`). See `payments-ledger.md`.
- **Stage timeline** — a section inside the `Prezentare` tab of objective
  detail (and reusable). See `stage-timeline.md`.

`Assumption:` Routing uses the client's TanStack file-route + `validateSearch`
(zod) convention exactly as `/pnrr` (`src/routes/pnrr.tsx`,
`src/schemas/pnrr.ts`). `$id` = surrogate `objective_id`; `$siruta` = SIRUTA
code; `$countyCode` = two-letter county mnemonic (e.g. `CJ`), consistent with
PNRR `panelCountyCode` uppercase handling.

### Cross-domain link-outs (Decision — evidence-led, never merged)

Shown in a `RelatedLinksRail` ("Surse conexe") where relevant:

- Beneficiary UAT / authority CUI → `/entities/$cui` (and `/primarie/$cui` when
  the beneficiary is a primărie), `/budget-explorer`.
- Contractor / designer CUI (when present **and** party not gated) →
  `/companies/$cui` or `/entities/$cui`.
- Candidate-only SEAP match → `/achizitii`, always labeled "posibilă
  corespondență, în curs de verificare" (UX R5). Never a default link.
- Same authority/territory → `/pnrr` for PNRR-funded works.

Each link carries a one-line "why" (matched on CUI / SIRUTA / candidate),
preserving foundation rule "cross-domain joins are evidence-led".

---

## 4. Shared layout and navigation decisions

- **Decision: Domain shell.** Every PI route renders a thin domain header:
  breadcrumb (`Investiții publice › …`), page title (`text-xl`/`text-2xl`
  `font-semibold tracking-tight`, first-level only), and a `CoverageRibbon`
  directly under the primary result (foundation: coverage near the result, not
  in docs). Constrained content uses `max-w-6xl mx-auto px-6`; map surfaces go
  full-bleed within the route.
- **Decision: Sub-navigation.** Objective detail uses shadcn `Tabs`
  (Prezentare / Plăți / Contract / Părți / Dovezi), tab in `?tab=` search param.
  Territory and analytics pages use section bands, not tabs.
- **Decision: Sticky compact filter bar** on `cautare`, `firme`, `analiza`, and
  territory pages where repeated filtering is the main action (foundation).
- **Decision: "Cum citesc aceste date"** explainer is reachable from every PI
  page header (a small ghost button opening a `Sheet`), and glossary terms
  (`contractat`, `decontat`, `absorbție`, `stadiu`) get `Tooltip` definitions at
  first use.

---

## 5. Domain components and reuse plan

### 5.1 Reuse existing (shadcn / client)

`Button`, `Badge` (variants: default/secondary/accent/outline/success/warning —
`src/components/ui/badge.tsx`), `Tabs`, `Table`, `Sheet`, `Dialog`, `Popover`,
`Tooltip`, `Select`, `MultiSelect`/`styled-multi-select`, `Collapsible`,
`Skeleton`, `EmptyState`, `Pagination`, `copy-button`, `active-filters-bar`,
`filter-tag`, `amount-range-picker`, `breadcrumb`, `scroll-area`. Map:
`InteractiveMap` (`src/components/maps/InteractiveMap.tsx`, maplibre-gl, UAT
features) + `MapLegend`. Filters: `county-filter`, `uat-filter`,
`amount-range-filter` under `src/components/filters/`. Data-quality banner
pattern: mirror `src/features/pnrr/components/PnrrDataQualityBanner.tsx`
(`Collapsible` + amber `Card`).

### 5.2 Shared trust components to standardize (foundation §"Shared components")

These do **not** exist yet (`grep` confirms none in `src/`). Propose under a
shared home (`src/components/provenance/` — Decision) because ≥2 domains need
them, and consume them across PI:

- `DataStatusBadge` — `live | mock | partial | stale | blocked | unverified`
  (text + icon + color). PI also uses `suspect`/`avertizare` amount states via a
  thin domain wrapper (see `AmountWithEvidence`).
- `CoverageRibbon` — page-level source / freshness / known-gap summary. PI fills
  it with per-program coverage, snapshot date, and gate status.
- `SourceProvenanceDrawer` (a.k.a. EvidenceViewer) — the "Vezi dovada" drawer.
  Owned/spec'd by `evidence-viewer.md`.
- `EvidenceLink` — the inline "Vezi dovada" trigger (button/link) that opens the
  drawer for a given `EvidenceRef`.
- `FreshnessBadge` — "Date până la <snapshot date>".
- `PrivacyBoundaryNotice` — explains why a party name is aggregated / redacted /
  withheld. Used wherever a gated party would otherwise appear.
- `IdentityConfidenceBadge` — high/medium/low objective identity certainty +
  concise explanation (expert surfaces).
- `MapListSync` — synchronized map ↔ list pattern (selection, hover, bounds).

### 5.3 New PI-domain components (Decision — under `src/features/public-investments/components/`)

- `AmountWithEvidence` — the workhorse. Renders a `MoneyValue` (locale money) +
  guard state (`ok` → plain; `precision_warning` → amber dot + tooltip;
  `suspect_x1000` → value replaced by "valoare în verificare" with the raw shown
  on disclosure) + an `EvidenceLink`. Reused on every PI surface.
- `AbsorptionBar` — decontat-vs-contractat horizontal bar with % label, accessible
  text fallback. (PNRR has progress bars but PI's "absorbție" semantics differ;
  domain-local.)
- `StageBadge` — normalized bucket (`Contractat | În execuție | Finalizat |
  Recepționat | Necunoscut`) as a text+icon pill, with the raw `Stadiu obiectiv`
  in a `Tooltip`/disclosure.
- `ProgramChip` — program filter/label chip (Anghel Saligny / PNDL / PNCCRS /
  PNMC), with coverage state.
- `StageTimeline` — vertical snapshot timeline; renders a disabled "istoric
  indisponibil momentan" state until backfill (`stage-timeline.md`).
- `HowToReadData` — the "Cum citesc aceste date" explainer sheet content.
- `ObjectiveListRow` / `ObjectiveCard` — the repeated objective record (list row
  for tables, card for map popovers/teasers).

---

## 6. Data model at the UI boundary (mock-first contract)

`Decision:` Mock data is shaped like the serving schema (UX §5) so the later API
adapter swaps in without UI rework. Types live in
`src/features/public-investments/lib/types.ts`; mock fixtures + `*.live.ts`
adapters under `src/features/public-investments/api/`. `Fact:` catalog flags
these datasets `apiReady:false`, `mockDataAvailable:false`
(`src/lib/scraper-references/catalog.ts` `investments-anghel-saligny`,
`investments-pndl`) — so the client ships **mock-first** and feature adapters
expose `import.meta.env`-style live/mock switching (mirror
`src/lib/scraper-references/mock-mode.ts`).

```ts
type ProgramCode = 'ANGHEL_SALIGNY' | 'PNDL' | 'PNCCRS' | 'PNMC'
// future programs (PNSS, Microbuze, ANL, PNCIPS, MIPE) render as "în curând".

type StageBucket =
  | 'contractat' | 'in_executie' | 'finalizat' | 'receptionat' | 'necunoscut'

// PI-1 + money_precision guard. Every amount carries this.
type AmountConfidence = 'ok' | 'precision_warning' | 'suspect_x1000'

type MoneyValue = {
  readonly amount: number | null     // RON, integer minor unit not assumed
  readonly confidence: AmountConfidence
  readonly raw: string | null        // original cell text for disclosure
}

// Provenance pointer — drives "Vezi dovada" everywhere.
type SourceUrlKind = 'workbook' | 'arcgis_api' | 'dead' | 'unknown'
type EvidenceRef = {
  readonly sourceRowKey: string
  readonly sourceFileId: string | null
  readonly objectId: string | null         // content-addressed MinIO object
  readonly sourceUrl: string | null
  readonly sourceUrlKind: SourceUrlKind     // label "date cartografice (API)" / dead
  readonly snapshotId: string | null
  readonly snapshotDate: string | null      // ISO; feeds FreshnessBadge
  readonly contentSha256: string | null
  readonly rowHash: string | null
}

type IdentityConfidence = 'high' | 'medium' | 'low'

// Privacy-gated. served=false => render PrivacyBoundaryNotice, never the name.
type PartyRole = 'executant' | 'proiectant' | 'beneficiar'
type PrivacyClass = 'public_aggregate' | 'personal_moderate'
type Party = {
  readonly partyId: string
  readonly role: PartyRole
  readonly displayName: string | null       // null when gated
  readonly cui: string | null
  readonly privacyClass: PrivacyClass
  readonly potentialNaturalPerson: boolean
  readonly reviewState: 'reviewed' | 'unreviewed'
  readonly served: boolean                  // false => withheld
  readonly evidenceRef: EvidenceRef
}

type ObjectiveSummary = {
  readonly objectiveId: string
  readonly program: ProgramCode
  readonly title: string
  readonly domain: string | null            // display label: apă/canalizare…
  readonly domainKey: string | null         // normalized key for filtering
  readonly county: string
  readonly countyCode: string               // e.g. "CJ"
  readonly uat: string | null
  readonly siruta: string | null
  readonly lat: number | null               // SIRUTA centroid (may be null)
  readonly lng: number | null
  readonly allocated: MoneyValue | null
  readonly contracted: MoneyValue | null
  readonly reimbursed: MoneyValue | null    // decontat
  readonly absorptionPct: number | null     // decontat/contractat, 0..100, null if N/A
  readonly stage: { readonly bucket: StageBucket; readonly raw: string | null }
  readonly hasContractorCui: boolean
  readonly hasDesignerCui: boolean
  readonly identityConfidence: IdentityConfidence
  readonly evidenceRef: EvidenceRef         // primary objective evidence
}

type ObjectiveDetail = ObjectiveSummary & {
  readonly beneficiary: Party | null
  readonly contractorCandidateCount: number // SEAP candidate matches (labeled)
  readonly relatedLinks: ReadonlyArray<{
    readonly kind: 'authority' | 'company' | 'procurement' | 'pnrr' | 'territory'
    readonly cui: string | null
    readonly siruta: string | null
    readonly label: string
    readonly why: string                    // "potrivire pe CUI" / "candidat SEAP"
    readonly verified: boolean              // false => candidate-only badge
  }>
}

type PaymentFact = {
  readonly paymentId: string
  readonly date: string | null
  readonly amount: MoneyValue
  readonly requested: MoneyValue | null     // solicitat
  readonly reimbursed: MoneyValue | null    // decontat
  readonly cumulative: MoneyValue | null
  readonly evidenceRef: EvidenceRef
}

type ContractFact = {
  readonly contractId: string
  readonly contractNumber: string | null
  readonly contractDate: string | null
  readonly contractor: Party | null
  readonly designer: Party | null
  readonly beneficiary: Party | null
  readonly value: MoneyValue | null
  readonly evidenceRef: EvidenceRef
}

type StageFact = {
  readonly snapshotId: string
  readonly snapshotDate: string | null
  readonly bucket: StageBucket
  readonly raw: string | null
  readonly evidenceRef: EvidenceRef
}

// Page-level coverage / data-status (CoverageRibbon + data-status notice).
type ProgramCoverage = {
  readonly program: ProgramCode
  readonly objectiveCount: number
  readonly loaded: boolean
  readonly note: string | null              // e.g. "doar 7 obiective (SIRUTA valide)"
}
type DomainDataStatus = {
  readonly snapshotDate: string             // ISO; current corpus date
  readonly validationGate: 'ok' | 'warning'
  readonly moneyPrecisionWarningRows: number
  readonly inflationBugActive: boolean      // PI-1
  readonly historyAvailable: boolean        // false until backfill
}
```

`Decision:` `absorptionPct` is computed server-side/in the adapter, clamped
0..100, and is `null` when contracted is 0/unknown or when either amount is
`suspect_x1000`. The UI never divides raw amounts itself.

`Decision:` Money is formatted with the client's locale money formatter
(`formatNumber` / `Intl.NumberFormat`, RON). Never hard-code separators.

---

## 7. Feature implementation map

MVP first, then high-value next (matches assigned order):

1. `objectives-map-landing.md` — MVP-1. Owner: map/dataviz front-end.
2. `objective-detail-hub.md` — MVP-2. Owner: entity-profile front-end.
3. `objectives-search-listing.md` — MVP-3. Owner: list/table + filters front-end.
4. `evidence-viewer.md` — MVP-4. Owner: shared-provenance front-end.
5. `locality-county-page.md` — MVP-5. Owner: territory/geo front-end.
6. `payments-ledger.md` — N1. Owner: table/dataviz front-end (detail tab).
7. `contractor-designer-directory.md` — N2. Owner: directory + privacy front-end.
8. `absorption-analytics-dashboard.md` — N3. Owner: analytics/choropleth front-end.
9. `stage-timeline.md` — N4. Owner: detail-section front-end (gated on backfill).

Build dependency: `evidence-viewer` (4) and the shared trust components (§5.2)
underpin 1–3 and 5–9; build the `EvidenceLink` + `SourceProvenanceDrawer` +
`AmountWithEvidence` trio early even though they sit at MVP-4 in the user
narrative.

---

## 8. Responsive behavior

- **Decision: Mobile-first.** ≤640px: map and list stack (map collapses to a
  short height with a "Vezi pe hartă" expander; list is primary). Tabs become a
  horizontally scrollable strip or a `Select`. KPI cards go single-column.
- **Decision:** Tables on `cautare`/`firme`/`analiza` switch to stacked record
  rows (`ObjectiveListRow`) under `md`; never horizontal-scroll a wide data
  table on phones for the primary columns. CSV export stays available.
- **Decision:** The provenance drawer is a bottom `Sheet` on mobile, side
  `Sheet` on desktop.

---

## 9. Accessibility, i18n, privacy, provenance (domain-wide)

- **A11y (Fact + Decision):** All controls keyboard-reachable and labelled;
  icon-only buttons get `aria-label`; decorative icons `aria-hidden`. Maps and
  charts have an adjacent textual summary and a tabular fallback for key values
  (county absorption ranking table beside the choropleth; objective list beside
  the map). `AbsorptionBar` exposes `role="img"` + `aria-label` ("decontat X din
  Y, Z%") and shows the % as text. `StageBadge` communicates state via
  text+icon, never color alone. Tabs/Sheets/Dialogs use Radix focus management.
- **i18n (Decision):** All user-facing text via Lingui macros (`t\`\``,
  `<Trans>`). Primary labels Romanian. Dates/money/percent via locale-aware
  formatters. Acronyms (PNDL, PNCCRS, PNMC, PNIAS, SIRUTA, UAT, CUI, SEAP)
  expanded on first use or in a tooltip; do not hard-code bare acronyms.
- **Privacy (Decision — orchestrator boundary):** The client treats any party
  with `served === false` (or `potential_natural_person === true`, or
  `privacy_class === 'personal_moderate'`, or `reviewState === 'unreviewed'`) as
  **withheld** and renders `PrivacyBoundaryNotice` in its place — fail-safe even
  if the API leaks. Gated party names are never used in search facets, CSV
  exports, map labels, or link text.
- **Provenance (Decision):** Every figure pairs with an `EvidenceLink`. Source
  links labeled by kind (`workbook` = "Vezi sursa", `arcgis_api` = "date
  cartografice (API)", `dead` = "link sursă indisponibil", `unknown` = neutral).
  Per-figure data-quality state is always visible at the point of use, never
  only in a global notice.
- **No money-flow modeling (Decision — orchestrator):** PI data is not rendered
  as `flows.money_flows`. Cross-domain relationships are link-outs with an
  explicit "why", not merged flow diagrams, until an approved cross-source
  policy exists.

---

## 10. Acceptance criteria (domain)

- All five canonical routes + `/firme` + `/analiza` resolve, render default
  state with no query params, and normalize invalid search params via route
  validation (not component effects).
- No PI screen displays a bare amount: every amount goes through
  `AmountWithEvidence` with a guard state and a working "Vezi dovada".
- PI-1 `suspect_x1000` amounts are never shown as numbers; the domain
  data-status notice is visible while `inflationBugActive` is true.
- No gated party name is rendered anywhere (UI, facets, CSV, map labels).
- Map surfaces have a tabular/list fallback; charts have an adjacent summary.
- Coverage ribbon shows per-program coverage + snapshot freshness + gate status
  on every list/landing/territory surface.
- Stage badges always offer the raw `Stadiu obiectiv` on disclosure.
- Stage timeline renders the "istoric indisponibil momentan" state while
  `historyAvailable` is false.
- `yarn typecheck` clean; i18n extracted/compiled; Lingui macros used for all
  copy.

## 11. Open questions (true blockers only)

- **B1 (party review pipeline):** real-name launch of the contractor directory
  (N2) is blocked on the `public_aggregate` review workflow. Design + mock launch
  proceed. (UX Open Q4.)
- **B2 (PI-1 launch gate):** product-owner must confirm whether amount displays
  may go live before the ×1000 reparse, given impossible-value guards + the
  data-status notice. (UX Open Q5.) Only blocker on the MVP critical path.

Everything else (visual choices, exact filter set, column order, mock values) is
decided in the feature files; do not escalate.
