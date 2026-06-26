# Feature: Public-Funding Cross-Links (`#fonduri` on the NGO profile)

> Next-3 — high journalist value; depends on CUI overlap that already exists in the
> hub. Source UX: `docs/ux-research/ngos.md` §13 Next-3, §8 Journey C, §12. Domain
> design: `docs/design/ngos/design.md`. Lives as the "Fonduri publice" section on the
> NGO profile + a `RelatedLinksRail`.

## Feature owner profile

Frontend implementation subagent specializing in **cross-domain linking + evidence-led
joins** (React 19 + TypeScript, TanStack Router, shadcn, Lingui). Must build joins that
show *why* two records connect (shared CUI / SIRUTA) and degrade gracefully when a
cross-domain source is backlog/absent. Reuses cross-domain link patterns; owns
`RelatedLinksRail`.

## Summary

A "Fonduri publice" section on the NGO profile that shows which public money an
organization receives, by following its CUI into procurement, PNRR, and money-flows,
plus a `RelatedLinksRail` of related entities (company, ANAF, public entity, territory).
Joins are evidence-led: each link states the join key (CUI/SIRUTA), and missing or
backlog sources (e.g. Legea 350) are shown as explicit "not yet available", never as
"no funding".

## Facts / Decisions / Assumptions

- **Fact:** Cross-domain keys exist in the hub: `cui` → companies, `core.public_entities`,
  procurement suppliers, PNRR contractors, `flows.money_flows`; `siruta_code` →
  `core.territories` (maps).
- **Fact:** PNRR C7-I9 ONG payments are **funding-owned** (PNRR lane); the NGO domain
  only *consumes* accepted CUI projections — payment facts live in `pnrr.*` / `flows`.
- **Fact:** Legea 350 (local NGO grants) is scraper **backlog** and name-only — not
  available as confirmed funding yet.
- **Fact:** 9,690 of 13,793 NGO CUIs also exist as `kind=company` (cross-link to
  `/companies/$cui`).
- **Fact:** Existing client routes for cross-links: `/companies/$cui`, `/entities/$cui`,
  `/pnrr`, `/budget-explorer`, `/maps`; entity-search routes procurement/PNRR hits to
  external URLs.
- **Decision:** Section renders **always** on the profile; when no funding links are
  found it shows an explicit "Nu am identificat fonduri publice corelate prin CUI"
  (absence-of-evidence, not absence-of-funding) plus the `RelatedLinksRail`.
- **Decision:** Each funding link shows the join basis ("corelat prin CUI") and a count/
  summary when available; clicking goes to the owning domain's surface.
- **Decision:** Legea 350 appears as a labeled "în curând (sursă în pregătire)" entry,
  not omitted.
- **Decision:** Use neutral language — `corelat prin CUI`, `necesită verificare`,
  `necorelare`; never imply misuse. A money-flow Sankey (UX §12) is reserved for a
  later visualization pass; MVP of this section is a summarized link list.
- **Assumption:** A cross-domain funding adapter returns per-source summaries keyed by
  CUI; exact procurement/PNRR/flows query shapes are integration details. The UI
  consumes a typed boundary, so backlog→live is an adapter change. Marked assumption.

## Route and URL state

- **No own route.** Renders as the `#fonduri` section within `/ong-uri/$cui` plus the
  profile's `RelatedLinksRail`.
- Outbound links carry `from=ong&cui=<cui>` (and `county`/`siruta` where relevant) so
  destination domains can offer backtracking (foundation cross-domain link decision).

## Data contract and mock states

```ts
type FundingSourceSummary = {
  source: 'procurement' | 'pnrr' | 'money_flows' | 'legea_350'
  label: string                        // plain-language Romanian
  joinKey: 'cui' | 'siruta'
  joinValue: string
  available: boolean                   // false for backlog (legea_350)
  recordCount: number | null
  totalAmount: { value: number; currency: 'RON' | 'EUR' } | null
  href: string | null                  // owning-domain surface
  lastSeen: string | null              // most recent record date when available
}

type RelatedEntityLink = {
  kind: 'company' | 'anaf' | 'public_entity' | 'territory'
  label: string
  href: string
  joinKey: 'cui' | 'siruta'
  joinValue: string
}

type PublicFunding = {
  cui: string
  siruta: string | null
  funding: FundingSourceSummary[]
  related: RelatedEntityLink[]
}
```

**Mock states:**
1. **Has funding** — procurement (N contracts, total), PNRR (M payments), money-flows
   summary; related rail populated.
2. **No correlated funding** — `funding` items all `recordCount: 0` → explicit
   absence-of-evidence message; rail still shows company/territory links.
3. **Backlog source present** — Legea 350 entry `available: false` → "în curând".
4. **CUI collision** — `related` includes a company link.
5. **No SIRUTA** — territory link omitted gracefully.

Mark with `DataStatusBadge variant="mock"`.

## UI structure

Within the profile `#fonduri` section (unframed band, source-cited where applicable):

1. **Heading** "Fonduri publice" + one-line intent: "Fonduri publice corelate prin CUI
   cu această organizație."
2. **Funding summary list:** one row per `FundingSourceSummary`:
   - Source label + join basis chip ("corelat prin CUI").
   - When `available`: record count + total amount (locale money) + last-seen date +
     "Vezi în <domeniu> →".
   - When `!available` (Legea 350): muted "în curând — sursă în pregătire" with
     `DataStatusBadge variant="blocked"`.
   - Zero records: "Nicio corelare găsită" (neutral).
3. **`RelatedLinksRail`** (narrow): company (`/companies/$cui`) when CUI collides, ANAF
   financials (the `#financiar` section / company financials), public entity
   (`/entities/$cui`), territory/map (`/maps` via SIRUTA). Each shows its join key.
4. **Provenance note:** funding facts are owned by their domains; a short note clarifies
   the NGO profile links to them rather than restating them, with a `SourceCitationChip`
   to the owning record where a single source exists.

## Component reuse and proposed new components

- **Reuse:** `Badge`, `Button`, `Table`/list, `Alert`, `Skeleton`, `EmptyState`,
  `Tooltip`, `Separator`.
- **Consume:** `SourceCitationChip`, `DataStatusBadge`, `FreshnessBadge`.
- **New (owned here):**
  - `RelatedLinksRail` — narrow cross-domain link rail (foundation component;
    reusable across domains).
  - `PublicFundingSection` — funding summary list with join-basis chips + graceful
    backlog/absent handling.

## Interactions

- Funding row "Vezi în <domeniu> →" → owning-domain surface with `from=ong&cui=…`.
- Related rail link → respective route (company/entity/maps) with join params.
- Backlog entries are non-actionable, clearly labeled "în curând".
- Keyboard: all links focusable with visible focus; counts/amounts in text.

## Loading, empty, error, partial, stale states

- **Loading:** section shows row skeletons; rail shows link skeletons.
- **Empty:** no correlated funding → "Nu am identificat fonduri publice corelate prin
  CUI" (explicitly absence-of-evidence, not "no funding"). Section never omitted.
- **Partial:** some sources available, others backlog/zero → each labeled
  individually; missing SIRUTA → territory link omitted without error.
- **Stale:** last-seen dates / `FreshnessBadge` where the owning domain provides them.
- **Error:** cross-domain fetch failure for one source → that row shows "Nu am putut
  verifica" + retry, others unaffected; URL preserved.

## Accessibility and i18n

- Join basis and counts are textual, not icon-only; `DataStatusBadge` states carry
  text.
- Links have descriptive labels (destination domain named); rail is a labeled `nav`.
- Lingui throughout; expand PNRR/CUI/SIRUTA; locale-aware money/counts/dates.

## Privacy, provenance, and source-citation behavior

- Evidence-led joins: every link states *why* it connects (CUI/SIRUTA), per foundation.
- No derived accusations; mismatch language is neutral (`necorelare`, `necesită
  verificare`).
- Funding facts are attributed to their owning domains; the NGO profile does not
  restate amounts as its own claims without a citation to the owning record.
- Backlog sources (Legea 350) shown as not-yet-available, never as "no funding".

## Acceptance checklist

- [ ] `#fonduri` section renders on the profile in all states (funding present, none,
      backlog, error) and is never omitted.
- [ ] Each funding row shows join basis ("corelat prin CUI"), and when available a
      count/total/last-seen + link to the owning domain with `from`/`cui` params.
- [ ] Legea 350 (and any backlog source) shown as "în curând", not omitted.
- [ ] `RelatedLinksRail` shows company (on CUI collision), ANAF, public entity, and
      territory links with their join keys; missing SIRUTA handled gracefully.
- [ ] Absence-of-funding renders as absence-of-evidence copy, not "no funding".
- [ ] All five mock states render; mock surfaces marked with `DataStatusBadge`.
- [ ] `yarn typecheck` clean; Lingui extracted/compiled.

## Non-goals

- No money-flow Sankey in this section's MVP (reserved later visualization; UX §12).
- No financial peer benchmarking (advanced ADV-3).
- No restating procurement/PNRR amounts as NGO-domain facts without citing the owning
  record.
- No Legea 350 content until the scraper source clears its backlog.

## Open questions (blockers only)

None block the section (renders with available cross-links + graceful gaps).
Non-blocking product input (UX §16 Q5): which funding sources to emphasize first —
current order is procurement, PNRR, money-flows, then Legea 350 when unblocked.
