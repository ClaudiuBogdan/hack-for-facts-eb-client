# Public Companies / State-Owned Enterprises — Domain Design

Implementation handoff for the `public-companies` domain (route family
`/intreprinderi-publice`). Read with `ux.md` and the shared foundation
`docs/design/README.md`. Source research: `docs/ux-research/public-companies.md`.

Every nontrivial statement is labelled **Fact** (grounded in the UX research /
scraper inventory / shipped client code), **Decision** (made here, binding for
implementation), or **Assumption** (defensible, to confirm but not blocking).

> **October 2026: superseded by §12.** Sections 1–11 were written for the mock
> era, before the API existed. They are background, not decisions to keep. The
> redesign on the live API starts at §12.

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

---

## 12. Redesign on the live API (October 2026)

The public-enterprises module is live on Chronos dev (GraphQL and MCP, no REST):
`publicEnterprise(cui)`, `publicEnterprises(filter, page, pageSize)` and
`publicEnterpriseSources`, over the five public read views of scrapper migration
`20261006T180000__public_enterprises_public_read_views`. Server contract:
`docs/server-redesign/15-public-enterprises.md` on the server's `origin/dev`.

### 12.1 The mock-era pages are retired (2026-10-07)

**Fact.** The old pages (`/intreprinderi-publice`, `/intreprinderi-publice/$cui`)
rendered only from fixtures. Their live adapter threw, so the profile answered
500 in every deployed environment, while global search already linked
`public_enterprise` hits there (160 hits for „apa" on 2026-10-07).

**Decision (owner, 2026-10-07).** Remove everything old now, not at promotion:

- Deleted: the mocks (`mocks/fixtures.ts`), the mock and live adapters, mock-mode,
  the hooks, the pages (`public-enterprises-pages.tsx`), their formatting/tab/KPI
  helpers, `src/schemas/public-enterprise.ts`, and every test of those.
- Kept: `lib/normalize-public-enterprise-cui.ts`. Global search routing uses it,
  and the new pages will too.
- `/intreprinderi-publice/$cui` → `/companies/$cui`, and `/intreprinderi-publice`
  → `/companies`. Both are **302** with `Cache-Control`/`CDN-Cache-Control:
  no-store` (the target changes at promotion, and a thrown redirect skips the
  routes' own headers), keeping only `lang`. A CUI is read as `RO`-prefix plus
  digits only, so `abc1` never lands on company 1. Search hits keep the old URL, so procurement's front door still
  reads a state company as a buyer (`procurementHrefOf`).
- The sidebar and landing entries (hidden behind the mock flag everywhere) are
  removed; they come back pointing at the new hub when it is promoted.
- Catalog: `soe-amepip` and `soe-controlling-authority` are `apiReady`, with no
  mock. RegAS, BVB, sanctions and governance documents stay registered as loaded
  but not served, with no mock and no client surface. The landing's provenance
  band now counts 8 datasets served live, not 6: `apiReady` means live on
  Chronos dev, as for `ngo-core` (the server flag is on only there).

### 12.2 The data on the live API (measured 2026-10-07)

Measured by reading every anchor through the API (1,743 profiles with all their
indicator pages, 1,743 company and financial reads, 946 authority entities and
1,721 × 3 SEAP counts). The scrapper notes predate the API; where they disagree,
these numbers are the live ones.

**Sources** (`publicEnterpriseSources`): AMEPIP `available`, the January 2026
workbook (modified 2026-01-13, observed 2026-06-18); S1001 `partial`, ANAF's list
of 26 August 2026 (observed 2026-10-06); JSON-APT `partial`, AMEPIP's selection
announcements (observed 2026-10-06). All three were accepted on 2026-10-07.

**Membership.** 1,743 anchors, 1,721 current members, 22 historical. Every
anchor has an `organization` (1,741 `company`, 2 `unknown`: 1558391, 21854235);
none is withheld today.

| Current families | Enterprises |
| --- | ---: |
| S1001 only | 458 |
| AMEPIP company-year + S1001 | 429 |
| AMEPIP company-year + form + JSON-APT + S1001 | 415 |
| AMEPIP company-year + form + S1001 | 273 |
| AMEPIP company-year + JSON-APT + S1001 | 104 |
| the other 8 combinations | 42 |

By family: S1001 1,694; AMEPIP company-year 1,247; AMEPIP form 707; JSON-APT 544
(an overlay: it never makes a member). 27 current members have no S1001 row (for
example 361897, CEC Bank; 25252500, EXIM). The 22 historical anchors carry no
observations, edges or families at all (3251058, 7477865, …): a page can say
only that they were once listed.

**Who controls them.** 2,242 control edges (S1001 1,694, JSON-APT 548). Every
edge has an authority CUI; 3 S1001 edges have no authority name (201217,
20415711, 44472200). 1,179 enterprises have one edge, 527 two, 3 three, and 12
current members none (25252500, 361560, …). 946 distinct authority CUIs; 705 of
them control one enterprise.

- **Levels.** S1001 reports only central (334) or local (1,360). The API's
  `county` level is never set: `authorityLevels: county` returns 0, while 100
  S1001 edges point at county councils (73452 → 4244997 CONSILIUL JUDETEAN BIHOR).
  Every JSON-APT edge is `unknown`, though each carries AMEPIP's `aptTypeId`
  (3 local council 349, 4 county council 74, 1 ministry 56, 5 ADI 54, 2 agency 15).
- **The authority's own record.** `entity(cui)` resolves all 946 authority CUIs
  (868 with budget data). Its `reference.entityType` and `territory.kind` split
  the S1001 edges without reading names: commune 684, municipality 320, town 183,
  county 100, Bucharest sector 16 (local); central authority 134, public entity
  116, education 50 (central); 91 unresolved. This is a join of two served
  records, not a name classifier; it is still a server ask (13).
- **The largest portfolios** (S1001, current members): AAAS 69, the Ministry of
  Economy 60, Education 50, Energy 33, ADS 32, Transport 30, Environment 27, the
  Bucharest General Council 21, Voluntari 16.
- **Names as reported.** 54 authority CUIs have two or more spellings (4230487:
  „CONSILIUL LOCAL MUNICIPIUL ORADEA" / „CONSILIUL LOCAL ORADEA"); S1001 drops
  Bucharest sector numbers (4420465 „CONSILIUL LOCAL AL SECTORULUI BUCURESTI",
  JSON-APT „… SECTORULUI 3 …"). S1001 and JSON-APT name different authorities for
  27 enterprises (789401: 4270740 vs 45699112). Disagreements stay visible.

**Statuses.** S1001: ACTIV 1,420, INACTIV 274, no S1001 row 27. AMEPIP's latest
company-year (2024 for 1,159 members): `funcţiune` 1,105, inactive 54, with the
source's own words (insolvency, bankruptcy, liquidation, deregistered); 474
members have no AMEPIP row. ONRC (companies module): `funcțiune` 891, none 744,
`radiată` 38, `dizolvare` 17, `lichidare` 11, and three unlabelled codes. ANAF:
286 declared fiscally inactive. The sources disagree (7 S1001 ACTIV with AMEPIP
2024 bankruptcy); a page shows each status with its source and never merges them.

**AMEPIP indicators.** One snapshot (`amepip-core-3a44f2c099fb711c`), 213,680
cells for 1,255 enterprises, at most 258 per enterprise: 136,238 numbers, 77,442
empty (`valueKind: empty`, `rawValue: null`; no `''` cell today). 43 KPIs:

- *Indicatori calculati*, 14 ratios, 2019–2024 (1,091 to 1,182 enterprises a
  year): MS market share, ROA, ROE, net and operating margins, turnover and
  profit growth, current and acid-test liquidity, leverage, debt/EBITDA, asset,
  receivables and stock rotation.
- *Indicatori formular*, 29 ESG and governance KPIs, 2019–2024 (692 a year, 583
  in 2024) and 2025 (one enterprise).
- **Traps.** 2,768 of the 4,044 form rows are empty in every KPI except dividend,
  capex and R&D rate, which still read numbers (781 rows read 0/0/0): read those
  three as unknown when the rest of the row is empty (ask 9). The DA/NU KPIs
  (EMP_T, GC_RISK) arrive as numbers 1/0, not booleans (ask 10). A `%` unit does
  not fix the scale: MS for 10020943 is 0.0425 „%", the largest MS is 283.2 (ask 11).

**Financials** (companies module): 1,623 current members have a financial year,
98 none. Turnover is filed by 553 (2008) to 1,441 (2023), 1,420 for 2024 and
1,325 for 2025 (incomplete). Of the 1,421 with a 2024 row, 893 report a profit
and 440 a loss. Largest 2024 turnover: Hidroelectrica, Transelectrica, Romgaz,
CEC Bank, Nuclearelectrica. One employee figure is a data error: EXIM 25252500
reports 92,149,177 employees for 2024 (ask 12).

**The company side** (companies module): legal form SRL 969, SA 571, RA 124,
INCD 43, none 13; the enterprise's own county for 1,707 (Bucharest 162, Bihor 79,
Constanța 75); main CAEN code for 1,684, no revision: water supply (36) 350,
building and landscape services (81) 167, waste (38) 148, real estate (68) 106,
land transport (49) 99, energy (35) 90, forestry (02) 87.

**Links.**
- *Companies:* every member has a company page (`/companies/$cui`); 2 have no
  company record (the `unknown` anchors).
- *Procurement (SEAP, 2019–2026):* 778 members buy (769 with direct purchases,
  488 with contract awards; `/procurement/institutions/$cui`) and 822 sell
  through direct purchases (`/procurement/suppliers/$cui`). Counts only: awards
  are not payments.
- *Budget:* the authorities are budget entities (`/entities/$cui`, 868 with
  budget data). The enterprises' own budget link (dividends, transfers) is not
  joinable: the budget carries the payer's CUI (PUBCO-048).

### 12.3 What the API lacks: server asks

Numbered for the server session; evidence is from 2026-10-07.

1. **Aggregates.** The API serves a list and a profile only. A hub needs exact
   counts by family, level, authority (ranked), S1001 status, legal form, county,
   CAEN division and indicator year; today the client must read 1,743 profiles and
   1,743 company records (about 15 minutes). Ask: a `publicEnterpriseStats` and a
   `publicEnterpriseBreakdown(dimension)` with exact counts, as the companies
   analysis layer does.
2. **List rows.** `PublicEnterpriseSummary` has no status, authority or geography,
   and the list sorts by CUI only, with no name search (`q` exists in MCP only).
   A directory would need a profile read per row. Ask: `q`, a name sort, and the
   current S1001 status and authority (CUI, level) on each summary.
3. **List filters.** Ask: S1001 status, legal form, county and CAEN division
   filters (the last two from the companies module).
4. **County level.** `authority_level = county` is never set (100 county-council
   edges are `local`, e.g. 73452 → 4244997). Ask: derive it or drop it from the enum.
5. **JSON-APT level.** 548 edges are `unknown` though `aptTypeId` is set
   (10020943 → 4420465, type 3). Ask: map `aptTypeId` to a level, or say why not.
6. **Authority identity.** Expose the authority's kernel organization beside the
   reported name: 54 authorities have several spellings, 3 have none, S1001 drops
   sector numbers.
7. **Enterprise geography.** `organization.countyName` and `localityName` are null
   for all 1,743 anchors; `sirutaCode` is set for 42. The companies module has the
   county for 1,707. Ask: fill it on the kernel identity or the summary.
8. **Historical anchors.** The 22 carry nothing. Ask: their last observation
   (source, snapshot, date).
9. **AMEPIP form zeros.** 2,768 form rows are empty except FIN-DP/RCC/RCCD, which
   read 0 in 781 rows. Ask the scrapper to check the workbook: a 0 the company did
   not write must be empty.
10. **DA/NU indicators.** EMP_T and GC_RISK are numbers 1/0 with unit „DA/NU". Ask:
    serve them as booleans.
11. **Percent scale.** Ask for each KPI's scale (fraction or percent): MS 0.0425
    „%" for 10020943, maximum 283.2 (PUBCO-036).
12. **Companies module:** EXIM 25252500 has 92,149,177 employees in 2024; ONRC
    headline status is empty for 744 members and three codes have no label
    (1139, 1083, 1120).
13. **Authority kind.** Ask for the authority's kind (ministry, agency, county
    council, local council, ADI) as a served field: the client now joins
    `entity(cui)`'s `reference.entityType` and `territory.kind` to tell them apart.
14. **Partial lanes.** S1001 and JSON-APT are `partial` with no limitation text.
    Ask: what is missing, so a page can say it.

### 12.4 The hub prototype (2026-10-07)

`/development/public-companies/hub` (`?v=control|marime|judete`), on real data:
`scripts/generate-public-enterprise-hub-fixture.mjs` reads the dev API and writes
`hub.fixture.json` (`--cache <dir>` reuses the reads). It is the shape a server
aggregate would serve (ask 1). Built from the hubs' own components: the lattice
head, `LandingSearch` scoped to public enterprises, `HomeSectionNav`,
`HubFiguresBand`, `HomeBand` + `HubSectionHead`, `IndicatorToggle`,
`HubCountyBand`.

- **Three variants, one per question the head leads with:** who controls them
  (authorities by count: the state, county councils, localities), how large they
  are (2024 turnover, headcount, loss), where they are (counties by seat). A
  variant's hero question has no band of its own, so no fact appears twice.
- **Bands:** who controls them (by the authority's kind, from its budget record),
  where their seat is (the hubs' county band), what they do (CAEN division),
  how large, the state each source gives (never merged), public money (SEAP
  counts, never sums).
- **Data trust:** one caveats marker in the head (partial lanes, control is not
  ownership, sources that disagree, members outside ANAF's list, no sums, the
  excluded employee figure); one source line with each source's own date.
- Names are set as the company page sets them (`displayCompanyName`); an
  authority's name is the source's most frequent spelling.
