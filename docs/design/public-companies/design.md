# Public Companies / State-Owned Enterprises — Domain Design

Implementation handoff for the `public-companies` domain (route family
`/intreprinderi-publice`). Read with `ux.md` and the shared foundation
`docs/design/README.md`. Source research: `docs/ux-research/public-companies.md`.

Every nontrivial statement is labelled **Fact** (grounded in the UX research /
scraper inventory / shipped client code), **Decision** (made here, binding for
implementation), or **Assumption** (defensible, to confirm but not blocking).

---

## 1. Domain purpose and scope

- Decision: Build a dedicated, investigative, entity-centric surface for Romanian
  state-owned enterprises, anchored on the live AMEPIP core lane, with five
  supplemental lanes designed to light up tab-by-tab as they deploy.
- Decision: This is a work surface, not a marketing site (README Shared
  Principles). Dense, scannable, lineage-forward.
- Fact: The data foundation is mature and the product surface is greenfield (UX
  §1). The highest-leverage work is IA + the profile, not more data.

## 2. High-level design patterns

These patterns apply across every page and feature in the domain.

- **Pattern A — Entity-centric tabbed profile.** Decision: The profile is one
  route with a header + a tab strip. Tabs are driven by data availability, not by
  static config alone: a live lane renders, a gated lane renders a labelled
  "în curând" panel, an irrelevant lane (e.g. BVB for a non-listed SOE) is hidden
  entirely. Mirrors the shipped `private-companies` page
  (`src/features/private-companies/components/private-company-page.tsx`).
- **Pattern B — Lineage on every fact.** Decision: Every block of source-derived
  data renders a `SourceLineageBadge`; expanding it opens a
  `SourceProvenanceDrawer` with snapshot id, workbook hash/date, accepted-at,
  source URL, and a "verifică ↗" link. Provenance is reusable, not bespoke per
  tab. See `features/source-lineage-verify.md`.
- **Pattern C — Source-labelled, never merged.** Decision: AMEPIP facts are
  labelled `Sursă: AMEPIP`; ONRC/ANAF facts reached via `company_links` are
  labelled `Registrul ONRC/ANAF`; the controlling authority is labelled
  `Autoritate tutelară`. `link_status` (matched / missing / ambiguous /
  not_checked) is shown honestly (Fact, UX §7). No combined "official" block.
- **Pattern D — Ratio/KPI safety.** Decision: Every indicator value renders
  through one shared `KpiValueKindRenderer` that (1) shows the `measure_unit`,
  (2) tags ratio/KPI vs absolute, (3) renders `number | boolean | text | empty`
  distinctly, and (4) never presents a ratio as currency. A plain-language
  glossary backs the headline KPIs. (Fact, UX §6/§15.)
- **Pattern E — Honest degradation.** Decision: Deploy-gated lanes use a shared
  `LaneStatusPanel` keyed by a `DataStatusBadge` state (`live | partial | gated |
  empty | mock`). A gated lane shows what it *will* contain + why it is not live,
  with a `RequestDatasetAction`/"anunță-mă" affordance where useful — never a
  blank tab or a thrown error (Fact, UX §15).
- **Pattern F — URL-addressable investigative state.** Decision: Tab, selected
  KPIs, year range, listing filters, sort, and page live in TanStack Router
  search params so any view is shareable (README Shared URL State).
- **Pattern G — Compact, divide-y density.** Decision: Lists use
  `rounded-lg border border-border/60` + `divide-y divide-border/60` rows with
  hover, per the map design principles; cards are reserved for repeated records,
  the header summary, and framed tools. No card-in-card (README).

## 3. Information architecture and routes

Fact: The orchestrator fixed the canonical route family. Fact: the scraper search
projection already emits `/intreprinderi-publice/<cui>`, so the product route and
search deep-links agree.

| Route | Purpose | Scope here |
| --- | --- | --- |
| `/intreprinderi-publice` (no query) | Landing: explainer, headline stats, search entry | `public-enterprises-landing.md` (MVP) |
| `/intreprinderi-publice` (query state) | Faceted enterprise listing | `enterprise-listing.md` (MVP) |
| `/intreprinderi-publice/$cui` | Enterprise profile (tabbed) | `enterprise-profile.md` (MVP anchor) |
| `/intreprinderi-publice/comparare` | Multi-enterprise comparison | Reserved (UX §14, not in this batch) |
| `/intreprinderi-publice/analiza` | Analytics dashboard | Reserved (UX §14, not in this batch) |

- Decision: Landing and listing share `/intreprinderi-publice`. Default (no query
  params) renders the landing/explainer + a short featured rail; any active facet
  or `q`/`sort`/`page` param renders listing mode (README: "Default views must
  render without query parameters"). Implementation may split into a landing band
  above an always-present search/results band; either way one route owns both.
- Decision: Profile tabs are addressed by a `tab` search param, not nested route
  segments, matching `private-companies` (`?tab=…`). Tab values:
  `profil | indicatori | autoritate | guvernanta | sanctiuni | bursa |
  ajutor-de-stat | relatii`. Default `profil`.
- Decision: Search routing (`src/features/entity-search/lib/entity-search-routing.ts`)
  should be updated **in the route slice** to send `public_enterprise` hits to
  `/intreprinderi-publice/$cui` instead of `/entities/$cui` (Fact, UX §16 Q1;
  resolves the §15 search-URL mismatch). This is the only existing-file change the
  domain requires; it is a routing-table edit, not a redesign.
- Decision: `/entities/$cui` remains the shared CUI rail for cross-domain budget
  context and is linked from the profile's "Relații" tab, never replaced.

## 4. Shared layout and navigation decisions

- Decision: Page container `max-w-5xl mx-auto px-6` for reading surfaces; the
  listing and analytics may go wider (`max-w-6xl`/`max-w-7xl`) where a table or
  facet rail needs it. 8pt spacing grid throughout (map design principles).
- Decision: Profile layout, top to bottom: (1) `CoverageRibbon` (domain-level
  freshness/coverage), (2) profile header card (identity + authority slot + ticker
  badge), (3) "Performance at a glance" headline-KPI band, (4) sticky tab strip,
  (5) active tab panel, (6) `RelatedLinksRail`, (7) source footer.
- Decision: The tab strip uses shadcn `Tabs`/the existing tab-nav pattern;
  on mobile it scrolls horizontally; gated/hidden tabs follow Pattern E.
- Decision: Sidebar navigation gets one entry "Întreprinderi publice" →
  `/intreprinderi-publice`. (Implementer: add to `src/components/sidebar`.)
- Decision: First-level page title (`text-2xl font-semibold tracking-tight`) only
  on landing and profile header; everything else uses compact operational type.

## 5. Domain components and reuse plan

### Reuse as-is or adapt (Fact: these exist in the client)

| Need | Reuse |
| --- | --- |
| Route loader + Zod search schema + `head` SEO | `src/routes/companies.$cui.tsx`, `companies.index.tsx` patterns |
| Tabbed profile shell + tab-config + URL tab state | `src/features/private-companies/` (`private-company-page.tsx`, `lib/tab-config.ts`, `components/layout/*`) |
| Mock/live API switch by dataset id | `src/features/private-companies/api/private-company-api.ts` + `lib/mock-mode.ts` + `src/lib/scraper-references/mock-mode.ts` |
| Source footer / provenance | adapt `private-company-source-footer.tsx` |
| List rows + facet chips + load-more + empty state | `src/features/entity-search/components/*` (`entity-result-row`, `entity-facet-chips`, `entity-load-more`, `entity-empty-state`, `entity-search-skeleton`) |
| Primitives | `src/components/ui/*` — `Tabs`, `Table`, `Badge`, `Button`, `Tooltip`, `Select`, `multi-select`/`styled-multi-select`, `Sheet`, `Dialog`, `empty-state`, `filter-tag`, `active-filters-bar`, `copy-button`, `pagination`, `skeleton`, `breadcrumb`, `accordion` |
| Charts | existing `src/components/charts/*` (Recharts) — same library as `private-company` financial trends |

### New domain components (build under `src/features/public-enterprises/components`)

Decision: Build these; propose to the shared layer (README) only the ones marked
"shared candidate" because at least two domains need them.

- `SourceLineageBadge` (shared candidate) — compact "Sursă: AMEPIP · workbook
  2026-01-13 · snapshot amepip-core-… · verifică ↗", opens drawer.
- `SourceProvenanceDrawer` (shared candidate — README names it) — full lineage.
- `DataStatusBadge` (shared candidate — README names it) — `live | partial |
  gated | mock | stale | empty`.
- `LaneStatusPanel` — degraded/coming-soon panel for a gated lane (Pattern E).
- `KpiValueKindRenderer` — renders one indicator value with unit + value_kind +
  ratio tag.
- `HeadlineKpiCard` — one sparkline + plain label + unit + vs-previous-year arrow.
- `EnterpriseHeader` — identity, status badge, ticker badge, authority slot.
- `ControllingAuthorityCard` — authority block (gated).
- `IdentityLinkRow` — one `company_links` row with `link_status` (shared
  candidate as `IdentityConfidenceBadge`-style).
- `RelatedLinksRail` (shared candidate — README names it) — cross-domain links.
- `EnterpriseResultRow` — listing row (adapt `entity-result-row`).
- `IndicatorPicker` — searchable KPI dictionary multi-select.

## 6. Data model expectations at the UI boundary

Decision: Define the domain Zod schema in `src/schemas/public-enterprise.ts` and
the feature module under `src/features/public-enterprises/`. Mock data must be
shaped exactly like the scraper serving tables (UX §5) so the live adapter is a
drop-in (README Mock-First contract). Field names mirror serving columns.

Core types (full per-field detail lives in each feature file):

```ts
// Identity + status (AMEPIP core — LIVE)
type EnterpriseIdentity = {
  cui: string                       // normalized 1–13 digits
  companyName: string
  registrationNumber: string | null
  companyId: string | null
  caenOnrc: string | null
  caenBilant: string | null
  amepipStatus: string | null       // Activ/Inactiv/Faliment/Lichidare/Reorganizare/Operativa
  tickerSymbol: string | null       // null for the vast majority
  latestYear: number | null
  indicatorCount: number
  inAmepipWorkbook: boolean          // true = current workbook; vs S1001-only
}

// Lineage (LIVE — attach to every fact group)
type SourceLineage = {
  sourceName: 'AMEPIP' | 'S1001' | 'json_apt' | 'RegAS' | 'BVB' | string
  snapshotId: string | null          // e.g. 'amepip-core-3a44f2c099fb711c'
  workbookSha256: string | null
  workbookDate: string | null        // ckan_last_modified / accepted-at, ISO
  acceptedAt: string | null
  sourceUrl: string | null
  license: 'CC-BY-4.0' | string | null
}

// Indicator value (LIVE)
type IndicatorValue = {
  indicatorKey: string
  kpiCode: string | null
  indicatorName: string
  measureUnit: string | null
  sourceSheet: 'calculated' | 'form'
  year: number
  valueKind: 'number' | 'boolean' | 'text' | 'empty'
  numericValue: number | null
  booleanValue: boolean | null
  rawValue: string | null
  warnings: readonly string[]
}

// Lane availability (drives Pattern E)
type LaneAvailability = {
  controllingAuthority: DataStatus
  bvb: DataStatus
  stateAid: DataStatus
  sanctions: DataStatus
  governance: DataStatus
}
type DataStatus = 'live' | 'partial' | 'gated' | 'mock' | 'empty'
```

- Decision: Mock-mode dataset ids: reuse the existing catalog entries `soe-amepip`
  and `soe-regas-state-aid` (Fact: present in
  `src/lib/scraper-references/catalog.ts`). Implementers should add catalog
  entries for the other gated lanes (`soe-controlling-authority`, `soe-bvb-market`,
  `soe-sanctions`, `soe-governance-docs`) and a
  `isPublicEnterpriseMockEnabled()` helper mirroring
  `src/features/private-companies/lib/mock-mode.ts`. (Decision; catalog is under
  `src/` so it is an implementation-phase edit, not part of these docs.)
- Decision: Until the API exists, ship mock-first. The feature API index
  (`api/public-enterprise-api.ts`) switches mock↔live exactly like the private
  companies index.
- Assumption: `LaneAvailability` is supplied by the API per environment; in mock
  mode it is a fixture flag. This lets a lane flip to `live` server-side without a
  client redeploy.

## 7. Feature implementation map

Order is MVP first, then high-value next (README rule).

| # | Feature file | Lane | Status | Anchor route/tab |
| --- | --- | --- | --- | --- |
| 1 | `public-enterprises-landing.md` | AMEPIP core | LIVE | `/intreprinderi-publice` |
| 2 | `enterprise-profile.md` | AMEPIP core | LIVE | `/intreprinderi-publice/$cui` (`?tab=profil`) |
| 3 | `kpi-time-series-tab.md` | AMEPIP core | LIVE | `?tab=indicatori` |
| 4 | `enterprise-listing.md` | AMEPIP core | LIVE | `/intreprinderi-publice?…` |
| 5 | `source-lineage-verify.md` | AMEPIP core | LIVE | cross-cutting |
| 6 | `controlling-authority-tab.md` | S1001 + json_apt | gated | `?tab=autoritate` |
| 7 | `bvb-market-reports-tab.md` | BVB | gated | `?tab=bursa` |
| 8 | `state-aid-tab.md` | RegAS | gated | `?tab=ajutor-de-stat` |
| 9 | `sanctions-enforcement-tab.md` | AMEPIP sanctions | gated | `?tab=sanctiuni` |
| 10 | `governance-document-viewer.md` | governance | URL-index only | `?tab=guvernanta` |

## 8. Responsive behavior

- Decision: Mobile-first (README/CLAUDE). Header collapses identity into a stacked
  block; the headline-KPI band becomes a horizontal scroll of cards; the tab strip
  scrolls horizontally; tables become horizontally scrollable within a
  `overflow-x-auto` wrapper with the first column (year or indicator name) sticky.
- Decision: The listing facet rail is a left column ≥`lg`, and a `Sheet`
  ("Filtre") triggered by a button `< lg`, mirroring existing search patterns.
- Decision: Charts get an adjacent tabular fallback at all breakpoints (README
  Accessibility), not only on mobile.

## 9. Accessibility, i18n, privacy, and provenance

- Decision (a11y): All controls keyboard-reachable and labelled; tables keep
  semantic `<table>` markup with descriptive headers; charts have an adjacent text
  summary + tabular fallback; badges are never the only state signal (status also
  in text); tooltips never hold the only critical info; `Sheet`/`Dialog` manage
  focus and have headings + close (README + map principles). Icon-only buttons get
  `aria-label`; decorative icons `aria-hidden`.
- Decision (i18n): Romanian primary, all user-facing strings via Lingui
  (`` t`…` `` / `<Trans>`). Locale-aware number/percent/date/money formatting
  (`Intl.*`). Expand acronyms in visible context or tooltip on first use:
  ÎP (Întreprindere Publică), APT (Autoritate Publică Tutelară), AMEPIP, OUG
  109/2011, ROA/ROE, ISIN, BVB, RegAS, CAEN, SIRUTA, CUI.
- Decision (privacy): Hard rule — never render the sanctions `responsible`
  person/role (raw-only, privacy-gated, Fact UX §6). Show only sanction text,
  date, legal basis, source. Governance viewer respects the future person-data
  minimization policy (UX Open Q6); today it lists document URLs only.
- Decision (provenance): Pattern B applies everywhere. License (CC-BY-4.0) and
  "as-of snapshot" surfaced near data, not in docs only.

## 10. Acceptance criteria (domain-level)

- A user can reach the domain from the sidebar, read a plain-language explainer,
  and see headline counts with a visible snapshot/"as-of" date.
- A `public_enterprise` search hit lands on `/intreprinderi-publice/$cui` (after
  the routing-table edit), not `/entities/$cui`.
- The profile renders identity + "performance at a glance" + lineage on the live
  lane with zero dependency on any gated lane.
- Every gated tab renders a labelled "în curând / nu este încă live" panel — never
  an empty page or error — and a lane flips to live via the `LaneAvailability`
  flag without a UI rewrite.
- No indicator is ever shown as an absolute currency value; every indicator shows
  its `measure_unit` and ratio/KPI tag; `text`/`boolean`/`empty` cells render
  without breaking.
- Every fact group exposes a `SourceLineageBadge` whose drawer reaches the
  official AMEPIP source URL.
- AMEPIP identity and ONRC/ANAF identity are never merged; `link_status` is
  visible.
- Sanctions UI never exposes a person/responsible field.
- `yarn typecheck`, Lingui extract/compile, and existing test patterns pass at
  implementation time (CLAUDE.md).

## 11. Open questions (blockers only)

- None block the MVP (AMEPIP core lane is live). The supplemental lanes each carry
  one true blocker — the **prod serving contract / API shape** for that lane — which
  is the deploy unblock (PC-3) and the backend module ownership decision (UX Open
  Q2/Q3). Until then those tabs ship in mock/gated mode. Each gated feature file
  restates its single blocker.
