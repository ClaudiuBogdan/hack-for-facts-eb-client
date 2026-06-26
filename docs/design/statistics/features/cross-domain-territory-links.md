# Feature: Cross-domain territory links

> Domain: statistics · Section of `/statistici/teritorii/$siruta` (and the map
> side panel) · High-value next #7
> Consumes: `docs/design/statistics/design.md`, `docs/design/statistics/ux.md`.

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router). Strength: building a
small, evidence-led cross-domain navigation rail with correct deep links and
context preservation. Minimal new data — this realizes the SIRUTA spine value.

## Summary

From any territory surface, offer a `RelatedLinksRail` that jumps to everything
else the platform knows about the same place: budget execution, the primărie
(town-hall) profile, companies registered there, public institutions, and the
map — each link carrying the territory context so users can backtrack. This is
the cross-domain payoff of anchoring statistics on SIRUTA.

## Facts, decisions, assumptions

- **Fact:** Existing destination routes (foundation §Route Strategy + verified in
  `src/routes`): `/entities/$cui`, `/companies/$cui`, `/companies` (directory),
  `/budget-explorer`, `/primarie/$cui`, `/primarie`, `/map`.
- **Fact:** `/budget-explorer` and `/map` consume filter/search params (county,
  uat, normalization) — see `src/schemas/map-filters.ts` (`MapStateSchema`) and
  the budget explorer filters. Territory-scoped deep links are therefore possible.
- **Fact:** The territory hub already resolves `{ siruta, level, countyCode,
  name }` (feature 1) and, where the territory is a UAT with a town hall, the
  associated primărie CUI is reachable through existing entity data (the entity
  profile is keyed by CUI and exposes `uat.siruta_code`).
- **Decision:** The rail is **evidence-led** (foundation rule): each link states
  the join key it uses — "după SIRUTA {siruta}" or "după CUI {cui}" — and links
  that cannot be resolved (e.g. no primărie CUI for this SIRUTA) are **omitted or
  shown disabled with a reason**, never rendered as dead links.
- **Decision:** Links and their context params:
  - **Buget local** → `/budget-explorer?county=<countyCode>&uat=<siruta>` (or the
    primărie's budget tab if a CUI exists) — scoped to the place.
  - **Primărie** → `/primarie/$cui` when a town-hall CUI resolves for the SIRUTA;
    else `/primarie?county=<countyCode>` as a fallback list.
  - **Firme** → `/companies?county=<countyCode>` (county-scoped directory;
    UAT-level company filtering only if supported).
  - **Instituții publice** → `/entities?county=<countyCode>` / search scoped to
    the territory.
  - **Hartă** → `/statistici/harti?level=<county|uat>&highlight=<siruta>`.
  - **Înapoi la statistici** is implicit (the rail lives on the hub).
- **Decision:** Every outbound link adds `from=statistici-teritoriu&siruta=<siruta>`
  so destination pages can offer a "back to territory" affordance (foundation
  cross-domain `from` param convention).
- **Assumption:** Exact param names for budget/companies/entities scoping
  (`county` vs `judet`, `uat` vs `siruta`) must match each destination route's
  validator; implementer reads the target route's `validateSearch` and adapts.
  Marked Assumption — the rail must not invent params a destination rejects.

## Route and URL state

- **No new route.** Rendered as a section/aside on
  `/statistici/teritorii/$siruta` and inside the map side panel
  (`/statistici/harti`). Reads `$siruta`, `level`, `countyCode`, resolved `name`,
  and optional primărie `cui` from the hub's resolved identity.

## Data contract and mock states

```ts
type RelatedLink = {
  key: 'buget' | 'primarie' | 'firme' | 'institutii' | 'harta'
  label: string                 // Romanian
  href: string                  // resolved deep link with from + context
  joinBasis: 'siruta' | 'cui' | 'county'
  joinValue: string             // shown as evidence ("după SIRUTA 54975")
  enabled: boolean
  disabledReason?: string       // when not resolvable
}
type RelatedLinksModel = {
  territory: { siruta: string; name: string; level: string; countyCode?: string; primarieCui?: string }
  links: RelatedLink[]
}
```

Mock states (`src/features/statistics/territory-hub/mocks/related.ts`):
- **UAT with primărie CUI:** all five links enabled, primărie → `/primarie/$cui`.
- **UAT without a resolvable primărie CUI:** primărie link disabled with reason;
  buget falls back to county-scoped.
- **County territory:** firme/instituții county-scoped; primărie → county list.
- **National/region:** only map + (national) budget links enabled; place-specific
  links disabled with reason.

## UI structure

```
<aside "Legături" / RelatedLinksRail>  (narrow rail on lg+, stacked list on mobile)
  header: "Vezi și în alte domenii"
  for each enabled link:
    <a> icon + label + small muted "după SIRUTA {value}" / "după CUI {value}"
  disabled links: muted row + Tooltip with disabledReason
```

- **Decision:** Rail is a simple `divide-y` list (DESIGN_PRINCIPLES list pattern),
  not cards; lives in the hub's right column on desktop, below content on mobile.
  Reuse `RelatedLinksRail` as the foundation shared component (statistics builds
  the first instance).

## Component reuse and proposed new components

- **Reuse:** `Button`/`a` (TanStack `Link`), `Tooltip`, lucide icons
  (`Landmark`, `Wallet`, `Building2`, `Map`), existing route definitions.
- **New (domain):** `RelatedLinksRail` (shared), `buildTerritoryRelatedLinks`
  pure helper that takes the resolved identity + reads destination param
  contracts and returns `RelatedLink[]`.

## Interactions

- Click → navigate to the destination with context + `from` params.
- Disabled link → no navigation; tooltip explains why (e.g. "Nu există primărie
  asociată pentru acest SIRUTA").
- The rail is identical on the hub and the map side panel (single component).

## Loading, empty, error, partial, stale states

- **Loading:** rail renders from the already-resolved identity; if primărie CUI
  resolution is async, that single link shows a small skeleton, others render.
- **Empty:** if no links resolve (rare; national level), show a muted "Legături
  indisponibile pentru acest nivel".
- **Error:** a failed CUI lookup disables only the primărie link with a reason;
  the rest are unaffected.
- **Partial:** the normal case — some links enabled, some disabled with reasons.
- **Stale:** not applicable (navigation links, not data values).

## Accessibility and i18n

- Each link is a real `<a>`/`Link` with descriptive text (not icon-only);
  disabled links are `aria-disabled` with the reason as accessible text, not only
  a tooltip.
- Romanian labels: "Vezi și în alte domenii", "Buget local", "Primărie", "Firme",
  "Instituții publice", "Hartă", "după SIRUTA {value}", "după CUI {value}",
  "Legături indisponibile pentru acest nivel".

## Privacy, provenance, source citation

- The rail shows **why** two records connect (the join key) per the foundation's
  evidence-led cross-domain rule. No data values are exposed here, only
  navigation; no accusatory framing. When a join is weak/absent, the link is
  disabled with an honest reason rather than guessing a CUI.

## Acceptance checklist

- [ ] Rail renders on the hub and map side panel from one shared component.
- [ ] Each link carries territory context + `from`; param names match each
      destination route's validator (no rejected params).
- [ ] Unresolvable links are disabled with a stated reason, never dead links.
- [ ] Join basis ("după SIRUTA/CUI") shown as evidence on each link.
- [ ] County/national levels degrade to scoped or disabled links appropriately.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled; links keyboard-accessible.

## Non-goals

- Building the destination pages or new scoping params on them (the rail adapts
  to existing contracts; if a destination lacks UAT scoping, county scoping is
  used).
- Showing cross-domain data values inline (links only).

## Open questions (blockers only)

None. Destination param names are an Assumption resolved by reading each target
route's validator at implementation time; unresolved joins degrade gracefully.
