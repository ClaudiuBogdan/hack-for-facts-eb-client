# Feature: Cross-domain entity 360 (CUI-joined profile rail)

> High-value next feature. Makes procurement not an island: one CUI links procurement
> → companies → PNRR → public investments → litigation → parliament.

## Feature owner profile

Implementation subagent type: **frontend feature engineer** (cross-domain links +
shadcn). Procurement contributes its slice into a shared rail; final ownership is a
documented blocker (UX Open Q8). Depends on `coverage-data-as-of-layer.md`.

## Summary

A narrow, evidence-led links rail (and a fuller "360" panel) that, given a CUI,
surfaces every domain in which that entity appears — with the join basis shown — so
an investigator can pivot from a supplier's procurement revenue to its PNRR
contracts, litigation, and registration in one move.

## Facts / Decisions / Assumptions

- **Fact:** Cross-domain joins are by CUI: authority `authority_cui` →
  `core.public_entities`; supplier `supplier_cui` → companies/`core.organizations`;
  procurement flows share `flows.money_flows` with PNRR/budget (UX §5.3, §7).
- **Fact:** The intended cross-domain spine is XS-1/XS-4 (authority ↔ supplier ↔
  budget ↔ litigation ↔ parliament), joined by CUI (UX §7 Assumption, §13
  "Cross-domain entity 360").
- **Fact:** README defines `RelatedLinksRail` as a shared cross-domain component and
  requires joins to be evidence-led (show *why* two records connect, especially when
  CUI/IDs/dates are missing).
- **Decision:** Procurement owns a **`getEntityCrossDomainPresence(cui)`** contract
  that returns which domains have data for a CUI + the join basis + a count/teaser.
  The procurement slices render the rail from this contract.
- **Decision:** Only render a link when the target domain confirms presence (truthy);
  never render a speculative chip. Each chip shows the join basis (CUI match) and
  identity confidence.
- **Assumption:** Until the shared profile owner is decided (Open Q8), procurement
  renders the rail **in-place on its own slices** (authority + supplier). If a shared
  `/profil/$cui` (or equivalent) is later chosen as owner, this same contract feeds
  it — no rework of the data shape.

## Route and URL state

- **Embedded** as a rail on `/entities/$cui?view=achizitii` and
  `/companies/$cui?tab=achizitii` (and reusable on detail pages). No standalone route
  in v1.
- **Params:** none of its own; links carry `from` + CUI to preserve context.

## Data contract and mock states

Adapter: `src/features/procurement/api/cross-domain-api.{ts,mock,live}.ts`.

```ts
type CrossDomainPresence = {
  readonly cui: string
  readonly identity: { displayName: string | null; confidence: IdentityConfidence }
  readonly domains: Array<{
    readonly domain: 'companies' | 'entities' | 'procurement' | 'pnrr'
      | 'public_investments' | 'litigation' | 'parliament' | 'money_flows'
    readonly present: boolean
    readonly joinBasis: 'cui' | 'org_id' | 'name_only' | 'indirect'
    readonly teaser: string | null            // e.g. "12 contracte PNRR"
    readonly href: string                      // target route with from + cui
    readonly confidence: IdentityConfidence
  }>
}
```

Mock states:

- **Rich entity** — present in companies, PNRR, litigation, money flows; chips with
  teasers.
- **Procurement-only** — other domains absent → only the present chips render.
- **Weak join** — a domain matched by `name_only`/`indirect` → chip shows lower
  identity confidence + "potrivire slabă".
- **No cross-domain data** — rail collapses to nothing / a small "fără legături
  confirmate" note.

## UI structure

1. **`RelatedLinksRail` (entity-360 variant):** a vertical list of domain chips
   (icon + domain label + teaser count), each linking out with `from` + CUI.
2. **Join-basis affordance:** each chip carries an `IdentityConfidenceBadge` and a
   tooltip "Legătură pe baza CUI" (or weaker basis). Weak joins visibly downgraded.
3. **Optional "360" expansion:** a `Sheet`/section listing all domains with their
   teasers for a fuller pivot view (not required for the rail MVP).
4. **Privacy note:** `PrivacyBoundaryNotice` when a domain (e.g. litigation) is shown
   at institutional level only / individual exposure withheld.

## Component reuse and proposed new components

- Reuse: `Badge`, `Tooltip`, `Sheet`, lucide domain icons, `Separator`.
- Shared: `RelatedLinksRail` (this feature realizes the entity-360 variant),
  `IdentityConfidenceBadge`, `PrivacyBoundaryNotice`, `DataStatusBadge`.
- New: `getEntityCrossDomainPresence` adapter + the rail variant. No new heavy UI.

## Interactions

- Chip click → target domain page with `from` + CUI (context preserved).
- Tooltip/badge reveals join basis + confidence.
- "360" expansion (if built) opens a side panel with all domains.

## Loading, empty, error, partial, stale states

- **Loading:** skeleton chips (rail height stable).
- **Empty:** "Nicio legătură cross-domeniu confirmată" small note (not an error).
- **Error:** rail fails silently to empty + a retry affordance; never blocks the host
  slice.
- **Partial:** weak-join chips downgraded; absent domains omitted.
- **Stale:** inherits host coverage; teasers may carry their own freshness.

## Accessibility and i18n

- Rail is a labelled navigation list; chips are links with accessible names.
- Confidence/join basis conveyed by text + icon, not color alone.
- All strings Lingui-wrapped; RO: "Legături", "Companie", "Instituție publică",
  "PNRR", "Investiții publice", "Litigii", "Parlament", "Fluxuri de bani",
  "Legătură pe baza CUI", "potrivire slabă", "fără legături confirmate".

## Privacy, provenance, source citation

- **Evidence-led:** a chip renders only when the target domain confirms presence;
  the join basis (CUI / org_id / name-only / indirect) is always shown.
- Litigation/justice links respect the platform's privacy posture: institutional
  insight first, individual exposure redacted/aggregated, with
  `PrivacyBoundaryNotice`.
- Weak/name-only joins are disclosed at the point of use, never presented as certain.

## Acceptance checklist

- [ ] Rail renders only confirmed-present domain chips, each with join basis +
      identity confidence.
- [ ] Weak (`name_only`/`indirect`) joins visibly downgraded.
- [ ] Links carry `from` + CUI; targets exist (or are gracefully absent).
- [ ] Privacy notice applied to sensitive domains.
- [ ] All mock states render; rail fails to empty without breaking the host.
- [ ] `yarn typecheck`; strings extracted/compiled; a11y pass.

## Non-goals

- No inferred relationships beyond confirmed CUI/ID joins.
- No new standalone profile route in v1 (pending ownership decision).
- No merging of identities across CUIs (no entity-resolution UI here).

## Open questions (blockers only)

1. **Cross-domain entity-360 ownership** (UX Open Q8) — whether procurement hosts
   its own profile or feeds a shared profile owned by another domain. This blocks the
   *final placement* of the 360 panel, **not** the rail or the
   `getEntityCrossDomainPresence` contract, which ship on procurement slices now and
   feed a shared owner later unchanged.
