# Feature: Enterprise Profile page (MVP anchor)

> MVP-2. Route `/intreprinderi-publice/$cui`. Ships on the live AMEPIP core lane.
> The single highest-value page and the anchor for every tab and cross-domain
> link. Read with `../design.md`, `../ux.md`, `source-lineage-verify.md`, and
> `kpi-time-series-tab.md`.

## Feature owner profile

Frontend feature implementation subagent (React 19 + TypeScript + TanStack Router
+ shadcn/ui + Tailwind v4 + Lingui). Should model the module on the shipped
`src/features/private-companies/` profile (route loader → Zod search → tabbed
shell → mock/live API switch → source footer).

## Summary

A dedicated profile that answers, in one screen, "what is this state-owned
enterprise, who controls it, and how is it performing?" — replacing today's
behavior where a `public_enterprise` search hit lands on the budget-centric
`/entities/$cui` page (Fact, UX §15/§16). The profile renders identity + a
controlling-authority slot + a "performance at a glance" headline-KPI band + a
source-lineage banner + a tab strip. Tabs beyond `profil`/`indicatori` render as
"în curând" or hide based on lane availability (Pattern E).

## Facts, decisions, assumptions

- Fact (UX §13 MVP-2, §10): Required data — `enterprise_years` (identity, status,
  ticker), `controlling_authorities` (degrade if gated), `company_links` (link to
  ONRC/ANAF profile), `source_snapshots` (lineage), and a small curated set of
  headline `indicator_values`.
- Fact (UX §7/§15): Link, never merge. AMEPIP identity is evidence, not canonical
  ONRC truth. `company_links.link_status` ∈ `matched | missing | ambiguous |
  not_checked` and must be shown honestly.
- Fact (UX §5): One enterprise has many `enterprise_years` rows (2019–2024/2025).
  The header shows the latest year's identity; the "as-of" year is explicit.
- Fact (UX §6/§15): Indicators are ratios/KPIs. Headline KPIs must show
  `measure_unit` and a ratio tag, never currency.
- Decision: Headline KPIs are a configurable list `HEADLINE_KPI_KEYS`
  (`src/features/public-enterprises/lib/headline-kpis.ts`). Default candidates
  (Assumption, UX Open Q4, needs dictionary validation): a profitability ratio
  (ROA/ROE), market share ("Cota de piață"), a debt/leverage ratio, an efficiency
  indicator. If a configured key is absent for an enterprise, render fewer cards —
  never a broken card. This is NOT a blocker; the list is data-driven.
- Decision: The controlling-authority slot in the header degrades gracefully:
  live → authority name + central/local chip + link; gated → "Autoritate tutelară
  — în curând" (Pattern E). The header never blocks on the authority lane.
- Assumption: `inAmepipWorkbook` distinguishes a current-workbook SOE from an
  S1001-only entry (Fact UX §6). On a profile this is normally `true`; if a CUI is
  S1001-only, show a banner "În lista oficială S1001, dar nu în registrul AMEPIP
  curent" and hide indicator tabs.

## Route and URL state

- Fact: `createFileRoute('/intreprinderi-publice/$cui')`, lazy + non-lazy split
  like `companies.$cui.tsx`.
- Decision: `loader` normalizes the CUI (strip non-digits, validate `^[0-9]{1,13}$`
  — reuse the spirit of `normalize-company-cui.ts`), fetches the profile, and
  throws `notFound()` when the CUI is invalid or unknown (mirrors
  `companies.$cui.tsx`).
- Decision: `validateSearch` parses `{ tab, kpis?, years? }` via
  `parsePublicEnterpriseProfileSearch` (Zod). `tab` enum:
  `profil | indicatori | autoritate | guvernanta | sanctiuni | bursa |
  ajutor-de-stat | relatii`, `.catch('profil')`. `kpis`/`years` belong to the
  indicators tab (see `kpi-time-series-tab.md`) but live in this route's search
  schema so the URL is shareable.
- Decision: Tab changes use `navigate({ search: prev => ({ ...prev, tab }) })`
  exactly like `private-company-page.tsx`. Tab panels render with `hidden`
  toggling (keep them mounted for the live tabs, lazy-mount heavy gated panels).
- Decision: `head()` SEO from the loaded profile (name + CUI + status), analogous
  to `buildPrivateCompanyRouteHead`.

## Data contract and mock states

`fetchPublicEnterpriseProfile(cui)` → `PublicEnterpriseProfile | null`
(mock↔live by `soe-amepip`). Shape mirrors serving tables (design.md §6).

```ts
type PublicEnterpriseProfile = {
  identity: EnterpriseIdentity            // design.md §6
  // Latest-year + available-years for the header / tabs
  availableYears: readonly number[]       // e.g. [2019..2024]
  // Controlling authority (gated lane) — null when not live
  authority: ControllingAuthoritySummary | null
  authorityStatus: DataStatus             // 'live' | 'gated' | 'empty'
  // Identity links (ONRC/ANAF, public_entities) — evidence, never merged
  identityLinks: readonly IdentityLink[]
  // Curated headline KPIs (subset of indicator_values for HEADLINE_KPI_KEYS)
  headlineKpis: readonly HeadlineKpiSeries[]
  // Per-lane availability for tab rendering (Pattern E)
  lanes: LaneAvailability
  // Lineage for the whole profile (current accepted snapshot)
  lineage: SourceLineage
}

type ControllingAuthoritySummary = {
  aptCui: string | null
  aptName: string | null
  subordination: 'central' | 'local' | null
  aptTypeId: 1 | 2 | 3 | 4 | 5 | null     // decoded label in lib
  county: string | null
  countyAbbr: string | null
  enterpriseStatusDescriptive: string | null
  resolvesInPublicEntities: boolean       // APT CUI found in core.public_entities
}

type IdentityLink = {
  registry: 'companies' | 'public_entities'
  registryCui: string | null
  linkStatus: 'matched' | 'missing' | 'ambiguous' | 'not_checked'
  evidence: string | null                 // why these are connected
  href: string | null                     // '/companies/$cui' or '/entities/$cui'
}

type HeadlineKpiSeries = {
  indicatorKey: string
  kpiCode: string | null
  indicatorName: string                   // RO from dictionary
  plainLabel: string                      // curated plain-language gloss
  measureUnit: string | null
  isRatio: boolean
  points: ReadonlyArray<{ year: number; valueKind: ValueKind; numericValue: number | null; booleanValue: boolean | null; rawValue: string | null }>
}
```

### States

- **Loading**: header skeleton + 3–4 headline-card skeletons + tab strip skeleton
  (reuse `private-company-page-skeleton` shape).
- **Not found**: route `notFound()` → a "Întreprinderea nu a fost găsită" panel
  (adapt `private-company-not-found-panel.tsx`) with a link back to the listing.
- **Empty headline KPIs**: if no `HEADLINE_KPI_KEYS` resolve, hide the band and
  show "Vezi toți indicatorii" linking to the indicators tab — no empty card row.
- **Error**: inline `Alert` with retry inside the affected band; identity header
  (already loaded) stays visible.
- **Partial**: authority slot + gated tabs show `DataStatusBadge` `gated`.
- **Stale**: snapshot older than ~9 months → muted "ca la {workbookDate}" note in
  the lineage banner (AMEPIP is yearly; do not alarm).

## UI structure

Container `max-w-5xl mx-auto px-6`, 8pt grid. Top to bottom:

1. **Breadcrumb**: `Întreprinderi publice / {name}` (shadcn `breadcrumb`).
2. **EnterpriseHeader** card (the framed summary record):
   - Line 1: `companyName` (`text-2xl font-semibold tracking-tight`) +
     `AmepipStatusBadge` + `TickerBadge` (only if `tickerSymbol`).
   - Line 2 (meta, `text-xs text-muted-foreground`): `CUI {cui}` ·
     `Nr. înreg. {registrationNumber}` · `CAEN {caenOnrc}` · `ca la {latestYear}`.
   - Authority slot: `Autoritate tutelară: {aptName}` + central/local chip + a
     `Link` to `/entities/$aptCui`; or gated panel.
   - A single `SourceLineageBadge` for the identity block.
3. **Performance at a glance** band: 3–4 `HeadlineKpiCard`s — each a small
   multi-year sparkline + plain label + `measure_unit` + a "față de anul anterior"
   arrow. Each card renders values via `KpiValueKindRenderer` and carries the
   ratio tag. A "Vezi toți indicatorii →" link goes to `?tab=indicatori`.
4. **Tab strip** (sticky): order `Profil · Indicatori · Autoritate · Guvernanță ·
   Sancțiuni · Bursă · Ajutor de stat · Relații`. Rendering rules:
   - `Profil`, `Indicatori`: always live.
   - `Bursă`: hidden entirely when `tickerSymbol == null` (Fact UX §13 Next-2).
   - `Autoritate`, `Guvernanță`, `Sancțiuni`, `Ajutor de stat`: render with a
     `gated`/`partial` `DataStatusBadge` next to the label when not live; the panel
     uses `LaneStatusPanel`.
5. **Active tab panel**: `Profil` shows the fuller identity + authority + identity
   links + a compact list of the latest-year highlight indicators. Other tabs are
   their own feature files.
6. **RelatedLinksRail** (Relații content, also surfaced as a rail): links to
   `/companies/$cui` ("Registrul ONRC/ANAF"), `/entities/$aptCui` ("Autoritate
   tutelară"), budget + procurement of the authority — each with its `link_status`
   shown honestly.
7. **Source footer**: adapt `private-company-source-footer.tsx`; AMEPIP snapshot +
   hash + CC-BY-4.0 + verify link.

### Profil tab content (default)

- Identity facts grouped under `Sursă: AMEPIP` label.
- Controlling authority block (or gated).
- `IdentityLinkRow`s: each ONRC/ANAF / public_entities link with a status pill —
  `matched` (neutral-positive), `missing` ("fără corespondent în registru"),
  `ambiguous` ("identitate ambiguă"), `not_checked` ("neverificat"). Never present
  AMEPIP identity as ONRC truth.

## Component reuse and proposed new components

- Reuse: tabbed-shell pattern from `private-companies` (`*-page.tsx`,
  `*-page-shell`, `*-tab-nav`, `*-page-skeleton`, `*-not-found-panel`,
  `*-source-footer`); `src/components/ui/*` (`Tabs`, `Badge`, `Tooltip`, `Button`,
  `breadcrumb`, `card`, `alert`, `skeleton`); existing Recharts chart components
  for the sparklines.
- New (under `src/features/public-enterprises/components`): `EnterpriseHeader`,
  `AmepipStatusBadge`, `TickerBadge`, `HeadlineKpiCard`, `KpiValueKindRenderer`
  (shared with indicators tab), `ControllingAuthorityCard`, `IdentityLinkRow`,
  `LaneStatusPanel`, `SourceLineageBadge` (+ drawer), `RelatedLinksRail`,
  `DataStatusBadge`. Tab config in `lib/tab-config.ts` mirroring
  `private-companies/lib/tab-config.ts`.

## Interactions

- Tab click → URL `?tab=…`; deep-linking to a tab works on first load.
- Headline card hover → tooltip with the indicator's plain-language definition +
  `measure_unit` + `kpi_code` (tooltip is never the only source of the unit; the
  unit is also printed on the card).
- "Vezi toți indicatorii" → `?tab=indicatori` with no KPI preselected.
- Authority link → `/entities/$aptCui`; identity link → `/companies/$cui` or
  `/entities/$cui`; all preserve context via `from` query where useful (README).
- `SourceLineageBadge` click → `SourceProvenanceDrawer` (see
  `source-lineage-verify.md`).

## Loading, empty, error, partial, stale states

See Data contract → States. Invariant: the identity header renders from the
core lane alone and is never blocked by any gated lane or by missing headline
KPIs.

## Accessibility and i18n

- Tab strip uses Radix `Tabs` semantics (`role="tab"`/`tabpanel"`, arrow-key
  nav); panels are `aria-labelledby` their tab (as in `private-company-page.tsx`).
- Each headline card has an adjacent text value + tabular fallback for the
  sparkline (README: charts need text summaries).
- Status/ticker badges are paired with text; never color-only.
- All copy Lingui-wrapped; acronyms expanded on first use (ÎP, APT, AMEPIP, OUG
  109/2011, ROA/ROE, CAEN, CUI). Numbers/dates locale-formatted.

## Privacy, provenance, and source-citation behavior

- Pattern B/C throughout: AMEPIP-labelled identity; ONRC/ANAF only via labelled
  links with `link_status`; authority labelled `Autoritate tutelară`.
- No person-level data on the profile. Sanctions/governance tabs enforce their own
  privacy rules in their feature files.
- Ratio/KPI tag on every headline value (Pattern D).

## Acceptance checklist

- [ ] A `public_enterprise` search hit / direct link to `/intreprinderi-publice/$cui`
      renders the SOE profile (not `/entities/$cui`).
- [ ] Header shows name, CUI, AMEPIP status, ticker (when present), CAEN, and an
      explicit "as-of" latest year.
- [ ] Controlling-authority slot links to `/entities/$aptCui` when live, else shows
      a labelled gated panel.
- [ ] 3–4 headline KPI cards render with `measure_unit` + ratio tag; missing KPIs
      reduce the count instead of breaking.
- [ ] `Bursă` tab is hidden when `tickerSymbol == null`; other gated tabs show a
      `DataStatusBadge` + `LaneStatusPanel`, never an empty/error panel.
- [ ] Identity links show `link_status` honestly; AMEPIP and ONRC identity are
      never merged.
- [ ] Source footer + identity lineage badge reach the official AMEPIP URL.
- [ ] `notFound()` path renders the not-found panel; invalid CUI is normalized in
      the loader.
- [ ] Lingui-wrapped; `yarn typecheck` clean.

## Non-goals

- No absolute financial statements here (link to `/companies/$cui` for ANAF
  bilanț values — Fact UX §6).
- No comparison/analytics here (reserved routes).
- No ownership % (gated on a future lane — Fact UX §6/§14).

## Open questions (blockers only)

- None for MVP. `HEADLINE_KPI_KEYS` defaults are an Assumption resolved by a
  data-driven config, not a build blocker.
