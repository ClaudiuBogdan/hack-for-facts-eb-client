# Feature: Social-Service Provider Discovery (`/ong-uri/servicii`)

> MVP-2 — the "find help nearby" surface. Source UX: `docs/ux-research/ngos.md`
> §10.3, §13 MVP-2, Journeys B & E. Domain design: `docs/design/ngos/design.md`.

## Feature owner profile

Frontend implementation subagent specializing in **geography-heavy faceted list+map
surfaces** (React 19 + TypeScript, TanStack Router with Zod `validateSearch`,
shadcn/ui, Tailwind v4, Lingui, TanStack Query). Must be fluent with the existing
`src/components/maps/InteractiveMap.tsx` (MapLibre) SIRUTA/County rendering,
`src/components/filters/county-filter`, and synchronized list/map interaction. Owns the
`MapListSync` and `StaleSnapshotNotice` shared components.

## Summary

A faceted, map-supported directory of licensed social-service providers and their
services so a beneficiary, advocate, or social worker can answer: *what accredited,
active social services exist in my county for this need?* List and county map stay in
sync; freshness is prominent because the data is stale (2023–2024).

## Facts / Decisions / Assumptions

- **Fact:** `social_service_providers` = 4,033; `social_services` = 5,407. SIRUTA
  present on 4,037/4,037 providers and 5,369/5,407 services (strong geo coverage).
- **Fact:** Provider snapshot is 10.04.2024; service snapshot is 11.12.2023; both
  flagged stale.
- **Fact:** Available fields — providers: `cui`, `provider_name`, `provider_type`,
  `county`, `locality`, `siruta_code`, `address`, `license_number`, `status`. Services:
  `provider_cui`, `provider_name`, `service_name`, `service_type`, `service_code`,
  `county`, `locality`, `siruta_code`, `address`, `license_number`, `valid_from`,
  `valid_until`, `capacity`, `status`.
- **Fact:** One provider → many services via `provider_cui`.
- **Decision:** Route `/ong-uri/servicii`; primary unit is the **service** (most
  actionable for "find help"), grouped by provider; a provider toggle is available.
- **Decision:** `MapListSync` — desktop list + county map; mobile toggles panes.
- **Decision:** Derived `status: active | expiring | expired` from `valid_until`;
  default filter shows active+expiring (not expired), with an explicit toggle to
  include expired.
- **Assumption:** Map granularity is **county-level choropleth/count** keyed by SIRUTA
  county code in MVP (the existing map supports `County` view); locality-level pins are
  a later enhancement. Reason: `InteractiveMap` is choropleth-oriented (UAT/County),
  and county counts directly serve "what exists in my county". Marked assumption, not
  block.
- **Assumption:** `provider_type` and `service_type` enumerations need plain-language
  Romanian labels; a small client-side label map is built from observed values until a
  canonical enum is provided.

## Route and URL state

- **Route:** `/ong-uri/servicii` (file route `ong-uri.servicii.tsx`).
- **Search params (Zod `validateSearch`, all optional, default view = no params):**
  - `q?` — free text (provider name, service name, license number).
  - `county?` — county code/name (single).
  - `locality?` — locality (single, dependent on county).
  - `service_type?` — comma-separated multi.
  - `provider_type?` — comma-separated multi.
  - `valid?: 'active' | 'all' | 'expired'` — default `active` (active+expiring).
  - `capacity_min?: number` — capacity > 0 / threshold.
  - `view?: 'lista' | 'harta'` — mobile pane; desktop shows both regardless.
  - `unit?: 'servicii' | 'furnizori'` — list grouping; default `servicii`.
  - `selected?` — selected county (drives map↔list sync + scroll).
  - `sort?: 'nume' | 'capacitate' | 'valabilitate' | 'judet'` — default `nume`.
  - `page?`, `pageSize?` — list pagination (default pageSize 25).
- **Decision:** Filters are shareable via URL (`ShareFilteredView` affordance copies the
  current URL). Map viewport (center/zoom) stays local, not in URL.

## Data contract and mock states

Consumes `SocialServiceProvider` and `SocialService` from `design.md` §6, plus a
map-aggregate shape:

```ts
type ServiceDiscoveryRow = SocialService & {
  derivedStatus: 'active' | 'expiring' | 'expired'
  snapshotDate: string | null   // from the cited MMuncii snapshot
}

type CountyServiceAggregate = {
  countyCode: string            // SIRUTA county
  countyName: string
  providerCount: number
  serviceCount: number
  byServiceType: Record<string, number>
}

type ServiceDiscoveryResult = {
  rows: ServiceDiscoveryRow[]
  total: number
  aggregates: CountyServiceAggregate[]   // drives the choropleth
  snapshot: { providerDate: string; serviceDate: string; stale: true }
}
```

**Mock states:**
1. **Populated** — multiple counties, mixed service types, mixed validity; a few
   providers with several services each.
2. **Single county filtered** — `?county=CJ` showing only Cluj results + map zoomed.
3. **No results** — filter combination yields nothing → `EmptyState` + clear-filters.
4. **Missing locality** — rows where `locality` null render "Localitate necunoscută".
5. **Mostly expired** — county where most services are expired; default `active` filter
   hides them with a "N servicii expirate ascunse — arată-le" affordance.

Mark with `DataStatusBadge variant="mock"` (and `stale` on the freshness furniture).

## UI structure

Wider layout `max-w-7xl mx-auto px-6`, 8pt grid.

1. **Header:** title "Servicii sociale acreditate" (`text-2xl font-semibold`), one-line
   intent, `CoverageRibbon` (MMuncii source + both snapshot dates + "date posibil
   depășite").
2. **`StaleSnapshotNotice`** (Alert, warning) directly under the header: "Datele provin
   din instantanee oficiale din 2023–2024 și pot fi depășite."
3. **Sticky filter bar:** county (`county-filter`), locality (dependent `Select`),
   service type (`styled-multi-select`), provider type (multi), validity toggle
   (`toggle-group`: Active / Toate / Expirate), capacity switch, free-text `q`
   (`debounced-status-input`). Active filters shown as `FilterTag`s in an
   `active-filters-bar` with "Șterge filtrele".
4. **`MapListSync` two-pane (desktop):**
   - **Left — list:** `unit` toggle (Servicii / Furnizori), sort `Select`, results
     count + freshness. Service rows (record cards / `divide-y` list): service name,
     provider name (link to `/ong-uri/$cui`), service type (plain language), county ·
     locality, capacity, license number, `valid_from→valid_until` with derived-status
     `NgoStatusBadge` (active/expiring/expired). Pagination at the bottom.
   - **Right — map:** `InteractiveMap` `mapViewType="County"` choropleth shaded by
     service count (respecting active filters), `MapLegend`, tooltip with county name +
     provider/service counts. Clicking a county sets `?selected=` and filters the list.
5. **Mobile:** `view` toggle (Listă / Hartă) shows one pane; filters open in a `Sheet`.
6. **Per-result freshness:** each row/section cites the MMuncii snapshot via
   `SourceCitationChip`.

## Component reuse and proposed new components

- **Reuse:** `InteractiveMap`, `MapLegend`, `county-filter`, `styled-multi-select`,
  `toggle-group`, `Select`, `debounced-status-input`, `filter-tag` /
  `active-filters-bar`, `Table`/list, `Pagination`, `Sheet`, `Badge`, `Skeleton`,
  `EmptyState`, `Button`, `ScrollArea`.
- **Consume:** `CoverageRibbon`, `FreshnessBadge`, `SourceCitationChip`,
  `NgoStatusBadge` (validity variant), `DataStatusBadge`, `ShareFilteredView`.
- **New (owned here):**
  - `MapListSync` — synchronized faceted list + county map; bidirectional selection
    (list hover/select ↔ map county highlight). Generic enough for other geo domains.
  - `StaleSnapshotNotice` — `Alert` wrapper with snapshot date + standard stale copy.
  - `ServiceResultRow` — service record card with provider link + validity badge.

## Interactions

- Filter change → updates URL search params (debounced for `q`), refetches list +
  recomputes aggregates; map reshades.
- Click county on map → `?selected=`, list filters to that county, map zooms; clicking
  again clears.
- Hover list row → highlight its county on the map (`highlightedFeatureId`).
- `unit` toggle switches list grouping (services flat vs grouped under providers).
- Provider name link → `/ong-uri/$cui?from=servicii`.
- "Arată serviciile expirate" → sets `?valid=all`.
- Copy current view (`ShareFilteredView`) → copies the URL with filters.
- Keyboard: all filters reachable; map has a tabular fallback (the list IS the
  fallback) and county summaries are textual.

## Loading, empty, error, partial, stale states

- **Loading:** filter bar renders immediately; list shows row skeletons; map shows a
  neutral choropleth skeleton/placeholder. Initial route load uses `pendingComponent`.
- **Empty:** no results → `EmptyState` "Niciun serviciu nu corespunde filtrelor." +
  "Șterge filtrele". Empty county on map → county shown unshaded with count 0.
- **Partial:** missing locality/address/capacity → labeled "—" / "Localitate
  necunoscută"; rows never dropped for missing optional fields.
- **Stale:** always-on `StaleSnapshotNotice` + per-row freshness chips. UI must not
  imply current truth.
- **Error:** data fetch failure → inline `Alert` with retry; URL preserved. Invalid
  search params normalized by `validateSearch`, not by component effects.

## Accessibility and i18n

- Map has an adjacent textual/tabular summary (the synchronized list) and county
  counts in text; never the only representation of data.
- Filters labeled; multi-selects keyboard operable; `Sheet` focus-managed.
- Validity badges have text + `aria-label`; color is not the only signal.
- Lingui throughout; plain-language service/provider type labels; locale-aware
  dates/capacity. Expand SIRUTA/MMuncii/ONG on first use.

## Privacy, provenance, and source-citation behavior

- All rows cite the MMuncii snapshot (source + snapshot date) via chip → drawer.
- This data is direct-CUI confirmed; no identity-confidence ambiguity here, but each
  provider links to its profile where confidence is shown.
- No derived accusations; "expirat" is a neutral validity state from `valid_until`.
- Stale framing is honest and unavoidable on the page.

## Acceptance checklist

- [ ] `/ong-uri/servicii` route with Zod `validateSearch`; default view (no params)
      renders nationwide results + choropleth.
- [ ] County, locality, service type, provider type, validity, capacity, and free-text
      filters all reflected in URL and applied to list + map.
- [ ] List ↔ map stay in sync (county click filters; row hover highlights).
- [ ] Default validity hides expired with an explicit reveal affordance.
- [ ] `StaleSnapshotNotice` + `CoverageRibbon` show both snapshot dates.
- [ ] Provider rows link to `/ong-uri/$cui`; "find help in my county" works from the
      county filter alone.
- [ ] All five mock states render; mock surfaces marked with `DataStatusBadge`.
- [ ] Mobile Listă/Hartă toggle + filter `Sheet` work.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled; map i18n audit passes
      (`src/components/maps/map-i18n-audit.test.ts` style).

## Non-goals

- No locality-level pin map in MVP (county choropleth only; pins are a later
  enhancement).
- No coverage-gap-vs-population heatmap (advanced ADV-2, needs INS).
- No export-to-file beyond copy-current-view in MVP (referral export is a later add).
- No editing/claiming providers.

## Open questions (blockers only)

None. (Non-blocking: locality-pin map and referral export are deferred enhancements;
canonical `service_type`/`provider_type` enums can be refined when provided.)
