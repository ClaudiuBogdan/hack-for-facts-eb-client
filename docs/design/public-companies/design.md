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

### 12.5 The hub in production: `/public-enterprises` (2026-10-07)

**Decision (owner, 2026-10-07):** promote the hub alone, variant `control`, at
`/public-enterprises` (English path, like `/companies`, `/procurement`,
`/national-budget`). The enterprise, authority and analytics pages come later,
prototype first.

- **Data:** `src/features/public-enterprises/lib/hub-snapshot.ts`, generated by
  `scripts/generate-public-enterprise-hub-fixture.mjs` from the dev API (it also
  rewrites the prototype's fixture). The route reads no API: the page renders in
  full on the server and caches publicly, as `/ngos` does. Only the search talks
  to the API, on typing. The source line gives each source's date and the day the
  figures were read; regenerate the snapshot when a source reloads, and say so
  in the commit.
- **Code:** `lib/` holds the pure model, text, format, links, sections and head
  (every sentence computed, tested on `lib/test/hub-snapshot-fixture.ts`);
  `components/hub/` the page, head, bands, parts, search and pending state.
  The pending state draws the head and the pinned bar without the snapshot or
  the search's code, so the route's eager file stays light.
- **URL state:** `autoritati` (stat · judete · local), `judete` and `domenii`
  (toate · locale · centrale), `marime` (cifra · salariati · pierdere); defaults
  stay out of the address.
- **Inbound links:** the sidebar and the landing page list the hub again.
  `/intreprinderi-publice` now answers **301** to `/public-enterprises`.
  `/intreprinderi-publice/$cui` still answers **302 no-store** to `/companies/$cui`
  until the enterprise page ships; global search keeps that address (procurement's
  front door reads it as a buyer), while the hub's own search goes straight to
  the company page. The sitemap and `llms.txt` list the hub.
- **Head:** title, a description quoting the snapshot's figures, canonical with
  `?lang=en` and hreflang, a `Dataset` JSON-LD (escaped).
- **Changes from the prototype:** the S1001 date read off the file name past
  the order numbers; registry names' doubled spaces collapsed; every count agreed
  with its noun (one / few / other); long status lists folded into six rows plus
  „Alte stări"; the money band's title one string („Banii publici"), since „Banii"
  is the NGO pages' word.
- **Review (Opus 5.5 xhigh, Codex gpt-6.1-sol xhigh), what it changed:**
  - Financial figures pass the companies module's admission policy, as its own
    pages do (`financial-qualification.ts`): only values the `sql-v1` evaluator
    reported enter a ranking or a count, profit and loss come from the
    evaluator's net result, and the statements without an admitted net result
    are counted and said (35 of 1,421 for 2024). EXIM's impossible headcount is
    not admitted, so it drops out on its own.
  - Statuses: a member ANAF's list does not hold is „Nu e în listă", counted
    apart from a listed member with a blank status („Fără stare în sursă"); the
    AMEPIP group says how many have no row for the year (560), so every source
    accounts for every member.
  - The counties and activities sentences follow the population their toggle
    shows; SEAP counts SEAP did not answer are unknown, never zeros (none
    today); contract awards are „prin proceduri", not „prin licitație"; members
    outside ANAF's list are „fără autoritate în listă", not without authority.
  - Two-line titles are one message each, so a pinned-bar label never shares a
    translation with half a title.
  - ANAF's „local" level is „autoritățile locale", not councils: it holds 57
    enterprises under associations (ADI) with no council budget record. The
    kinds carry ANAF's level, so an authority with no budget record is
    „centrală" or „locală" by the list's word.
  - Authority names are ANAF's list's spelling only („CONSILIUL LOCAL ORADEA",
    not the announcements' „… MUNICIPIUL ORADEA"); where the list gives none, the
    fallback is marked „nume din altă sursă" and HTML entities are decoded.
  - The trade registry's empty headline status is the companies module's
    conflicting or partial evidence, not an empty cell: „Fără o stare sigură în
    registru"; the registry's disagreements with ANAF's list are floors.
  - Shares under half a percent read „<1 %", never „0 %". Ranked rows link
    through the router (preloaded on intent) and show the focus ring; the search
    keeps the focus off when the address names a band (`#stare`), as the other
    hubs' searches do; the pending state holds the ranking card's whole shape.
  - The page's snapshot carries only what the page reads (45 KB); the
    prototype's fixture keeps the full counts (families, legal forms, filed years,
    indicator years) for the pages to come.
  - Left on purpose: `IndicatorToggle`'s 36 px buttons (the landing skin's shared
    component, under 44 px on phones, as on every hub) and the NGO search shell's
    duplicate here (another session's component): owner's call.
  - Second verification round: the AMEPIP status is the financial year's own
    row (a 2025 row no longer hides a 2024 one); the statements' publisher is
    read (`sourceSystem`: all 2024 statements are ANAF's) and named, never
    assumed; the year after is a count („pe 2025 sunt deocamdată 1.325"), not a
    claim that it is incomplete; the two members with no company record are
    counted apart („Fără fișă de firmă"); the budget record's central kinds are
    „Autorități centrale" and „Alte instituții publice centrale" (a ministry can
    be either); the admission rule is one module
    (`lib/financial-admission.ts`) the generator imports and the tests cover.
  - Known, left for the owner: internal links drop `?lang=en` on every hub (the
    language then follows the cookie); the headline's „primăriilor" covers
    county councils and ADIs loosely; the snapshot is regenerated by hand
    (`node scripts/generate-public-enterprise-hub-fixture.mjs`) when a source
    reloads.
  - Final verification: the admission module applies the company pages'
    whole consistency check (every metric once with a known status, the net
    result's two statuses equal, its value present exactly when reported), held
    to the companies schema by a test; the generator's company cache is named
    for its query (`companies-v3.json`) so an older read is never reused; the
    publisher wording is derived everywhere (neutral when none is recorded);
    counts of one agree with their verbs.

### 12.6 The enterprise page prototype (2026-10-07)

`/development/public-companies/enterprise` (`?v=control|afacerea|fisa`, `?cui=`,
ten samples picked above the page), on the live API: no snapshot, since one
profile is one read. It is the target of every enterprise link once it ships
(the hub's rows, the hub's search, global search, `/intreprinderi-publice/$cui`).

**What it reads.**
- `publicEnterprise(cui)` with every indicator page (258 cells, three pages)
  and four SEAP counts, 2019–2026: direct purchases and contract awards, as
  buyer and as seller.
- For each authority the edges name, its budget record (`entity`) and the
  other enterprises the lists give it: `publicEnterprises(filter:
  { authorityCuis: { in: [cui] } })` works today (Consiliul Local Sibiu 4,
  the Ministry of Energy 33, AAAS 69).
- The company side is the company page's own read
  (`usePrivateCompanyProfile` + `buildCompanyProfileModel`), so status, the
  figures and the five-year chart are the company page's, admission included.

**The page.** The company page's rhythm: kicker (front door / county), the
name, a sentence (the company sentence, then who controls it with the
authority as the subject: „Consiliul Local Sibiu o controlează, după lista
ANAF…", so no participle has to agree with the legal form), one chip per
source's status (ANAF's list, AMEPIP's latest year when not in business, the
trade registry, ANAF's inactive list), the CUI, the company page link, one
source line. Then the pinned bar, four figures (the company page's turnover,
net and headcount; direct purchases made, when there are any), and bands.

- **Control:** one row per authority; two sources naming the same CUI share
  the row and both are named (Hidroelectrica: the list and the announcements
  both name the Ministry of Energy); different CUIs are two rows (Tursib:
  Consiliul Local Sibiu vs ADI Transport Metropolitan Sibiu). The kind (județ,
  municipiu, oraș, comună, sector) is shown only for local authorities: the
  budget record calls the Ministry of Energy a „public_entity", which misleads
  as a caption.
- **Status by source:** a row per source with its date; AMEPIP's years run
  together while their words are the same („2019–2024 este sub incidența
  Legii nr. 85/2014, faliment" for Goscom Râșnov, active in ANAF's list).
- **The business:** the company page's chart and a link to it; the company
  page keeps the statements.
- **AMEPIP:** both sheets as tables, full width, KPI rows by year, the unit
  beside the name and the code after it; an empty cell is a dash. The form is
  grouped by its own code prefixes (Finanțe, Conducere, Angajați, Egalitate de
  gen, Mediu, Inovare, Clienți).
- **Public money:** SEAP counts as buyer and as seller, each linked to its
  procurement page; sums stay on those pages.

**AMEPIP's scale, checked.** Five of the calculated sheet's „%" ratios are fractions: each equals
the statements' own ratio as a fraction in 809 of 818 enterprise-years (40 enterprises, 2020–2024):
net margin (net ÷ turnover, 168 of 168), ROE (net ÷ equity, 187 of 189), ROA (net ÷ (fixed assets +
current assets + prepaid expenses), 182 of 185), turnover growth (turnover ÷ last year's − 1, 168 of
169) and profit growth (net ÷ last year's net − 1, checked on the years with a profit both years, 104
of 107). The page shows these five as percents, moving the point two places exactly. The operating
margin (the statements carry no operating result), market share (largest value 283,2) and the form
are not checked and stay as written, the „%" in amber and said in words: the form mixes scales within
one KPI (Tursib's dividend rate 0,5 in 2023, 50 in 2024; Hidroelectrica's „fixed components" 721.164
%). This answers ask 11 for those five ratios; the rest still need it.

**The form trap (ask 9) applied.** A form year is shown only when a KPI other
than FIN-DP, FIN-RCC and FIN-RCCD has a value; the years held back are named
under the table. Tursib's form has 2023–2024; its 2019–2022 rows carry only
those three.

**Variants.**
- `control` — the head names each source's authority; a band lists the
  same authority's other enterprises.
- `afacerea` — the head carries the company page's five-year chart; the control
  band carries the other enterprises.
- `fisa` — the head shows six answers from the newest form (headcount, board
  meetings, independent and women board members, the remuneration package,
  the dividend rate), or four ratios when there is no form; the AMEPIP band
  still has everything, so those values appear twice.

**Edge cases the samples cover:** sources naming different authorities
(Tursib), ANAF's list dropping a sector number (ADPB), a county council
(Aeroportul Oradea), active in the list but bankrupt in AMEPIP (Goscom
Râșnov), ratios only (Ocolul Silvic Sebeș), inactive with no statements
(Infosistem), not in ANAF's list and no authority (EXIM), no company record
(1558391), historical (Utilserv'96).

**Server asks this adds.**
15. **Scale per KPI.** Serve the scale (fraction, percent, as reported) with
    each KPI; five calculated ratios are fractions (checked above), the
    operating margin, market share and the form are unknown.
16. **Authority on the edge.** The control edge could carry the authority's
    kernel name and kind, so a page needs no `entity` read per authority (asks
    6 and 13).

### 12.7 The enterprise page in production: `/public-enterprises/$cui` (2026-10-08)

**Decision (owner, 2026-10-07):** promote the prototype's `afacerea` variant, with three changes the owner
agreed to: what the enterprise spends replaces the bare SEAP counts; the AMEPIP band opens on the board's
answers, the tables one click away; the bands run control → public money → AMEPIP → status, context last.

- **Reads.** Three, each its own query, each its own part of the page when it is pending or failed:
  - the enterprise (`api/public-enterprise-api.ts`): the profile and every indicator page (a cursor is
    pinned to the AMEPIP snapshot: a change mid-read, a failed page or more than ten pages leave the
    indicators unknown), then each authority's budget record and its enterprises in one aliased request with
    variables. A failed indicator or authority read is `null` and the read `partial`;
  - the company page's own read (`fetchPrivateCompanyProfile`), so the head's chart, the figures and the
    registry status are the company page's, admission included;
  - the procurement institution page's last twelve months (`fetchProcurementBuyer(cui, 'recent')`), so the
    spending is the institution page's, in its words.
- **Server render.** The loader reads the three side by side (`api/public-enterprise-ssr.ts`: each kept ten
  minutes, bounded to 500 CUIs, each under a 6 s deadline) and seeds the queries; the browser reads nothing
  on mount after a whole render (checked). A render is cached publicly (`s-maxage=600`) only when all three
  answered in full; otherwise `no-store`. A CUI no list holds is a 404 with its company page's link; a path
  that is not a canonical CUI (2–10 digits, no leading zero, as the API takes it) is a 404; the legacy
  redirect and every link drop a `RO` prefix and leading zeros, and make no link a 404 would answer. The head
  (title, a description naming the authority as ANAF's list spells it, else as the announcements do,
  canonical with `?lang=en` and hreflang, an `Organization` JSON-LD with the tax id) is built from facts the
  loader works out (`lib/enterprise-seo.ts`), so the route's eager file imports no model. An enterprise no
  list holds any more, or no source names (it is said „Întreprinderea cu CUI …", never named by its CUI),
  is `noindex`; so is a render without the enterprise read.
- **The page.** Head: kicker, the name, the company sentence then who controls it, one chip per source's
  status, the CUI, the company page, one source line; beside it, the company page's five-year chart. Figures:
  the company page's turnover, net result and headcount, then the 12-month direct-purchase value. Bands:
  - *Cine o controlează*: one row per authority CUI with the sources that name it; the lede says only whether
    the two sources agree (who controls it is the head's sentence, said once); the authority's other
    enterprises link to their pages.
  - *Banii publici*: the institution page's activity sentence, its top five direct-purchase categories and
    suppliers (by value, without VAT; contracts counted only, their money being provisional), the link to the
    institution page; what it sells, the company page's own figure and link.
  - *Ce raportează la AMEPIP*: the newest form's board answers (FTE staff, board meetings, independent and
    women members, pay package, dividend rate), else the newest ratios; *Toate valorile AMEPIP, pe ani* opens
    both tables. The fraction rule (§12.6) and the form-trap rule apply.
  - *Ce spune fiecare sursă*: a row per source with its date, no lede (the chips and the table say it).
- **Ways in.** `/intreprinderi-publice/$cui` answers **301** to the page. The hub's largest enterprises and its
  search, global search (`entity-search-routing`) and `buildPreferredEntityPath` lead to it; procurement's
  search reads the new address as a buyer too. `llms.txt` lists it.
- **Review (Opus 5.5 xhigh, Codex gpt-6.1-sol xhigh, three rounds each), what it changed:**
  - A deadline on a later read leaves that part unknown and the profile standing; only a reader who left
    aborts the read. The company read takes the deadline's signal, so a stalled request is stopped.
  - A lane the API reports unavailable is said unread, never „none", and the render is not cached; each lane
    is said for itself (in ANAF's list and the list naming no authority are two facts).
  - An unread count is never „no purchases"; „no direct purchase" is said once, in the lede; an empty
    breakdown beside a positive count is said unread.
  - Names: each source's own spelling, under its own source when they differ; a source that gave none is
    named by the other source's spelling (credited), then the budget record's (credited, it names the
    territory), else by its CUI as a CUI. Agreement needs both CUIs known and equal.
  - The fraction rule covers only the five ratios checked against the statements (§12.6).
  - Facts said once: the control band shows only with an authority to show, its lede only that the
    sources agree; AMEPIP's notes live behind the head's marker; the ANAF status left the control caption.
  - Tables: a tbody per form section; the scroll box is focusable and named by its title; an unchecked
    „%" says so in words.
- **Found on the way:** leaving the page while procurement's last twelve months waited for SEAP's cutoff left
  the buyer's identity read rejected with no handler (an unhandled `AbortError`, also on the institution
  page's default view), and the supplier read's registry read likewise. Each is handled at once now, with a
  regression test.

### 12.8 The authority portfolio prototype (2026-10-08)

`/development/public-companies/portfolio` (`?v=tabel|stare|marime`, `?cui=`, fourteen samples picked above
the page): one controlling authority's public enterprises, the page the hub's "who controls the most" rows
and the enterprise page's "the same authority's other enterprises" would lead to (proposed address
`/public-enterprises/authorities/$cui`). The owner asked for it on 2026-10-08.

**Why a snapshot.** Measured on dev-chronos on 2026-10-08 for AAAS (69 enterprises): the list by authority
answers in 0.2 s and the 69 profiles in three aliased requests of 0.2–0.3 s each, but the company records
(`company` + `companyFinancials`, 10 CUIs a request, 7 requests side by side) took 10–12 s, and 5 of the 7
returned `INTERNAL_SERVER_ERROR` (`Database`) for some aliases. A live page cannot read a large portfolio's
statuses and figures, so the prototype reads what `scripts/generate-public-enterprise-hub-fixture.mjs` already
reads for the hub: it now also writes `src/development/prototypes/public-companies/portfolio.fixture.json`
(the sampled authorities and their enterprises, one line each, 184 KB), and with `--cache` it dates every
output by the cache's first read rather than by the run. The hub's outputs are unchanged by it (checked: a
run on the 2026-10-07 cache differs only in that date).

**What the snapshot holds.**
- *An authority:* its name as ANAF's list spells it most often (else the announcements', else the budget
  record's, the source kept), every spelling by source, the budget record's own name (it names the territory),
  ANAF's level, its kind from the budget record, its county, whether it has a budget, and the enterprises each
  source puts under it.
- *An enterprise:* name, legal form, seat county, main CAEN code; ANAF's list's status (or not in the list),
  AMEPIP's newest company-year row in its own words, the trade registry's headline code and label (or none,
  or no record), ANAF's inactive list; every control edge; the 2024 statement's admitted turnover, headcount
  and net result with each value's evaluator status (`reported`, `held_profile`, …), the newest year it filed;
  SEAP record counts 2019–2026.

**The page.** The enterprise page's rhythm. Head: the way back and the county (or „Autoritate centrală"), the
name, a sentence of what each source gives it („După lista ANAF a întreprinderilor publice, controlează 4
întreprinderi. Anunțurile de selecție AMEPIP o numesc pentru 2 dintre ele. Pentru una dintre cele din listă,
anunțurile numesc altă autoritate."), the CUI, the budget page (or „Fără fișă în buget"), one source line.
Figures: four counts of enterprises (with a 2024 statement, with a 2024 loss, buying and selling through SEAP),
never money. Bands: the enterprises (the variant's form), where the sources disagree (only when they do),
what they do and where (from five enterprises on; the county list only when they are in more than one).

**Variants.**
- `tabel` — head: each source's word on the enterprises, a bar per source (never one stacked status). Band:
  one table of every enterprise, sortable by 2024 turnover, headcount, net result or name, filtered by the
  list's word; on a phone, the name (with the list's word under it) and the turnover.
- `stare` — head: the five largest by 2024 turnover. Band: groups by ANAF's list (active, inactive, blank, not
  in the list), the active ones another source contradicts first; at the right, the 2024 turnover or the last
  year with a statement.
- `marime` — head: each source's word. Band: a ranking by 2024 turnover, headcount or loss, with bars against
  the top row; then those with no admitted figure, each with why.

**Data rules applied.**
- The page's enterprises are those either source puts under the authority: ANAF's list's first, then those
  only the announcements name, marked. Every count says its source.
- Each source's status stays its own: a row flags AMEPIP's newest year when it is not „funcţiune", the
  registry when it says struck off, insolvency, dissolution or another code, and ANAF's inactive list; a
  registry with conflicting evidence flags nothing.
- A disagreement is read from this authority's side: in the list under it while the announcements name only
  another; or named only by the announcements while the list names another or none. The announcements naming
  no one is not one: they cover only the selections AMEPIP published.
- A missing figure is never a zero, and a zero is shown: no statement ever, the last statement's year, a
  statement only for a later year, or a value the evaluator held back („reținut", with its reason under the
  list), left blank or did not admit. 15 of the sampled enterprises' 2024 net results are `held_profile`
  (Poșta Română, Conpet, Oil Terminal, Hidroelectrica, Romgaz, Nuclearelectrica, …), as on the company pages.
- Nothing is summed across enterprises; sizes are a ranking.

**Edge cases the samples cover:** the largest companies (Ministry of Energy); a portfolio mostly inactive
(AAAS 56 of 69, ADS 30 of 32, ADS with no budget record); research institutes (Education, 40 INCD); one more
enterprise only in the announcements (CGMB) or two (Hunedoara); the announcements naming another authority
(Consiliul Local Sibiu for Tursib); authorities named only by the announcements (the Bucharest-Ilfov and
Sibiu transport ADIs); a list that drops the sector's number (Sector 3); two spellings (Borș).

**Server asks this adds.**
17. **Portfolio read.** One read per authority: its kernel identity, kind and level, and its enterprises as
    summary rows (each source's status, seat county, main CAEN code, the latest admitted figures with their
    statuses). Today a page needs a profile and a company read per enterprise (asks 2 and 16).
18. **Company reads under load.** Ten aliased `company` + `companyFinancials` reads take 10–12 s and fail
    with `Database` errors when a few run side by side (2026-10-08): a batch read (`companies(cuis:)`) or
    summary figures on a list row.

### 12.9 The authority portfolio in production: `/public-enterprises/authorities/$cui` (2026-10-08)

**Decision (owner, 2026-10-08):** promote the prototype's `tabel` variant.

- **Data.** `scripts/generate-public-enterprise-hub-fixture.mjs` writes
  `src/features/public-enterprises/lib/portfolio-snapshot.json`: all 946 authorities a current member's edge
  names (keyed by CUI) and their 1,709 enterprises, one line each, 1.4 MB. It comes from the same run as the
  hub's snapshot, so the hub's authority rows and the portfolios agree; both are dated by that run's reads
  (2026-10-07). The prototype's fixture keeps its fourteen samples. A test holds the snapshot to its schema
  (`src/schemas/public-enterprise-portfolio.ts`): every authority's CUI is one an address takes, every
  enterprise it names is in the file.
- **Reads.** Only server code imports the snapshot. The route's loader reads it behind `import.meta.env.SSR`
  (`api/authority-portfolio-server.ts`), so the client bundle drops the read and the file. A client-side
  navigation fetches the authority's part from `/public-enterprises/authorities/$cui/portfolio.json`, a server
  route (`$cui/portfolio[.]json.ts`), and parses it against the schema. That path is outside `/api`, which the
  dev server proxies to the API. The router keeps a portfolio once read (`staleTime: Infinity`); the page caches
  publicly (`s-maxage=3600`), the JSON likewise. An authority the snapshot does not hold, or a path that is not
  a canonical CUI, is a 404 with the way back, and offers no link a 404 might answer.
- **The page.** The prototype's `tabel`:
  - *Head:* the way back, the county or „Autoritate centrală", the name (its source credited when it is not
    ANAF's list), the sentence of what each source gives it, the CUI, the budget page (or „Fără fișă în
    buget"), one source line with the read date; beside it, a bar per source.
  - *Figures:* four counts of enterprises. The SEAP pair says „cel puțin" when SEAP left a count unanswered and
    goes when it answered for none.
  - *Bands:* the table, then the disagreements (only when there are some), then activities and seats (from
    five enterprises on).
  - *Table:* the order (`?ordine=cifra|salariati|rezultat|nume`) and the filter by the list's word
    (`?lista=toate|active|inactive|altele`) are in the address, defaults left out, every key returned (§12.5).
    Changing them never reads again.
  - *Missing values:* a row with no statement for the year says so once, in its turnover cell, with dashes
    after; a held value says „reținut", its reason under the table, once.
  - *Words:* a lane down at read time is said down, never read as „none".
- **Ways in.** The hub's "Cine controlează cele mai multe" rows now open the authority's portfolio (they opened
  its budget page, and only when it had one). On the enterprise page, the control band's "Aceeași autoritate
  mai are" list ends with „Toate întreprinderile autorității, cu starea și cifrele lor". The authority's name
  there still opens its budget page. `llms.txt` lists the page.
- **Freshness.** The enterprise page is live; the portfolio is the snapshot. The two can differ by the
  snapshot's age, and the portfolio says its date. Regenerating the snapshot regenerates the hub (about 15
  minutes, design note §12.4).
- **Review (Opus 5.5 xhigh, Codex gpt-6.1-sol xhigh), what it changed:**
  - *A lane down at read time* is one part, „not read", in its source's row of the panel and in the table's list
    column, and no disagreement is computed with it (the head sentence already said so).
  - *The panel's ANAF row* counts the list's word over the enterprises the list puts under this authority, and
    says where it has the others (under another authority, listed with none named, not listed), so the row
    agrees with the head's count (CJ Hunedoara: 3, plus 2 under other authorities).
  - *Links:* the generator also writes `lib/portfolio-index.ts`, the snapshot's version and the authorities it
    holds, and every link to a portfolio (the hub's rows, the enterprise page's control band, the other
    authorities in the disagreements) checks it, so no link answers 404 (the enterprise page is live and may
    name an authority the snapshot predates). The enterprise page links the portfolio even when the live lists
    could not be read; with one enterprise known, it does not.
  - *The JSON address carries the snapshot's version* (`?v=`), so a cache never serves another snapshot's copy;
    it is cached a day (`no-store` in dev), its 404 never, and it is `noindex`.
  - *Not found:* both routes (this one and `/public-enterprises/$cui`) register their not-found page in the eager
    file; a path the params reject fails before the lazy file loads and used to land on the root's page.
    `Kicker` and `OutLink` moved to the light `enterprise-links.tsx`.
  - *Words:* each count agrees with its noun and pronoun („o întreprindere, pe care lista nu o pune"); the sales
    figure is „Vând prin achiziții directe" (supplier contract awards are not read); each SEAP count is a floor
    by its own unanswered reads, and stays when one field is missing; a company record without its fiscal flag
    is „Fără stare fiscală în fișă", not „no record"; a missing statement is „ultimul bilanț: {year}" whatever
    that year is; „În funcțiune" and the filter's labels have their own messages (context), not other pages'.
  - *Facts said once:* the filter shows no counts (the panel has them); the read date is the source line's only;
    a row no longer repeats that the announcements name another authority (the disagreements band says it).
  - *The page* remounts per authority (keyed), every row is in the server's HTML (past two dozen hidden until
    „all"), ties sort in Romanian collation on server and browser alike, and the held-value note follows the
    filtered rows.
  - *Second round:*
    - the table's „Lista ANAF" column and its filter read each row as the panel does: „Active" are the list's own
      active enterprises here, and one the list puts under another authority says so in the column and falls
      under „Altele";
    - the sentence picks its form by how many the list gives the authority („o numesc și ele pentru ea",
      „pentru toate", „Pentru ea, anunțurile numesc altă autoritate");
    - the version is the snapshot's content hash; the JSON route answers only for its own (another is a 409
      nothing caches; no version, served uncached), and the error page's retry reloads the document, which the
      server renders whole;
    - with the list published in part, absence is „Nu apare în listă"; with it unread, a row is „numită în
      anunțurile AMEPIP", not „doar";
    - an order by a column a phone hides says itself above the table;
    - a failed snapshot load is not kept;
    - the enterprise page's note for unread authority records no longer says the other enterprises are
      unavailable (the portfolio link stands);
    - `/public-enterprises/authorities` leads to the hub's control band (302, its `?lang=` kept).
  - *Third round:*
    - an enterprise whose only "name" is its CUI (two in the snapshot) is „Întreprinderea cu CUI …": the
      generator drops the placeholder, and the link checks for it too;
    - the row chip „doar în anunțurile AMEPIP" is gone, since the list column says where the list has it;
    - the sentence says „Pentru cea din listă" / „Pentru fiecare dintre cele din listă", so its referent cannot be
      the announcements' own enterprises named just before;
    - the JSON route's 404 and 409 also send `CDN-Cache-Control: no-store`;
    - the English „Does not appear on the list" keeps the partial-copy nuance.
  - *Left as is, on purpose:* the hub („Nu e în listă" in its status band) and the enterprise page („nu e în
    listă") still word absence from ANAF's list flatly. Bringing them to „nu apare" is a follow-up for both pages
    together, so one change carries the wording across.
