# Feature: NGO / Entity Profile (`/ong-uri/$cui`)

> MVP-1 — the anchor surface of the domain. Source UX: `docs/ux-research/ngos.md`
> §10.2, §13 MVP-1. Domain design: `docs/design/ngos/design.md`. Foundation:
> `docs/design/README.md`.

## Feature owner profile

Frontend implementation subagent specializing in **entity-profile surfaces** (React
19 + TypeScript, TanStack Router file routes with Zod `validateSearch`, shadcn/ui,
Tailwind v4, Lingui). Comfortable composing many source-cited sections, reusing the
existing `src/components/entities` profile patterns, and wiring TanStack Query data
hooks behind a mock-first adapter. Depends on the shared components delivered by
`identity-confidence-communication.md` (MVP-4) and `evidence-trail-source-citations.md`
(MVP-3); build or stub those first.

## Summary

A single organization-anchored, source-cited profile that answers the donor /
beneficiary / journalist trust questions in one scroll: *is this ONG registered,
accredited, recognized, sanctioned — and what's the source of each claim?* The CUI
organization is the anchor; confirmed (direct-CUI) evidence fills the main column;
name-only references sit in a separated, clearly-unconfirmed zone; financials render a
placeholder until ANAF is seeded; an evidence trail closes the page.

## Facts / Decisions / Assumptions

- **Fact:** Populated direct-CUI tables feed this page: `organization_evidence`
  (19,929), `sector_memberships` (9,176, RUEIS social-economy), `accreditations`
  (1,313, ANOFM employment), `social_service_providers` (4,033), `social_services`
  (5,407). `financial_indicators` = 0 rows.
- **Fact:** `legal_registry_records` (MJ) and `public_utility_status` (SGG) are
  name-only and NOT promoted to confirmed identity; they may appear for this
  organization's name only as unconfirmed references.
- **Fact:** 9,690 of 13,793 touched NGO CUIs also exist as `kind=company` — the same
  CUI can be both ONG and firm; the hub does not reclassify.
- **Fact:** SGG `hg_date`/`recognition_year`/`order_number` are ~0% populated; MJ
  `document_date`/`document_number` are dead columns — do not render them.
- **Fact:** Social-service snapshots are stale (providers 10.04.2024, services
  11.12.2023).
- **Fact:** No backend NGO module/route exists yet; mock-first is required.
- **Decision:** Route is `/ong-uri/$cui`; `/entities/$cui` shows an NGO band linking
  here for `kind=ngo`; global entity-search NGO hits deep-link here.
- **Decision:** Sectioned scroll layout with sticky in-page anchor nav, fixed trust
  order; not route tabs.
- **Decision:** Confirmed content in the main column; name-only references in a
  separate amber-bordered "Referințe neconfirmate" zone.
- **Decision:** Status badge strip under the header; each status also explained in
  its section.
- **Assumption:** county/locality can be null on RUEIS/accreditation rows; render
  "Localitate necunoscută" rather than hiding the row. (UX §6 marks this likely.)
- **Assumption:** A single profile API call returns the org header + grouped evidence;
  if the real API splits per kind, the adapter composes them. (Mock-first; adapter
  detail, not a UI block.)

## Route and URL state

- **Route:** `/ong-uri/$cui` (TanStack file route `ong-uri.$cui.tsx`). `$cui`
  normalized/validated like `companies.$cui` (`normalizeCompanyCui` idiom); invalid →
  `notFound()`.
- **Search params (Zod `validateSearch`):**
  - `tab?` — optional deep-link to a section anchor (`identitate`, `registru`,
    `sectorial`, `acreditari`, `servicii`, `utilitate`, `financiar`, `fonduri`,
    `dovezi`). Default: none (top of page).
  - `evidence?: '1'` — open the evidence trail expanded on load.
  - `from?` — provenance of navigation (e.g. `cautare`, `servicii`, `procurement`) to
    preserve backtracking; used for the "Înapoi la …" affordance.
  - `lang?` — existing locale param passthrough.
- **Decision:** Default view renders with no params. Section scroll updates `tab`
  via `replace` (no history spam). Ephemeral state (open drawer, hovered badge) is
  local.

## Data contract and mock states

Consumes the shared boundary types in `design.md` §6: `OrganizationHeader`,
`SectorMembership[]`, `Accreditation[]`, `SocialServiceProvider`,
`SocialService[]`, `PublicUtilityStatus[]` (name-only), `LegalRegistryRecord[]`
(name-only), `FinancialIndicator[]` (empty), `EvidenceRecord[]`, `SourceSnapshot`
(by id), `LinkReviewCase[]` (for candidate matches).

Profile adapter shape at the UI boundary:

```ts
type NgoProfile = {
  header: OrganizationHeader            // includes alsoKinds for CUI-collision cross-link
  sectorMemberships: SectorMembership[] // RUEIS
  accreditations: Accreditation[]       // ANOFM
  provider: SocialServiceProvider | null
  services: SocialService[]             // grouped under provider
  publicUtility: PublicUtilityStatus[]  // name-only references for this name
  legalRegistry: LegalRegistryRecord[]  // name-only references for this name
  financials: FinancialIndicator[]      // [] today
  evidence: EvidenceRecord[]            // full citation spine
  snapshotsById: Record<string, SourceSnapshot>
  candidateMatches: LinkReviewCase[]    // only if review cases with confidence exist
}
```

**Mock states to ship (in the feature module's `mocks/`):**
1. **Full confirmed ONG** — registered + RUEIS + ANOFM accreditation (active) +
   provider with several services (mixed active/expired) + an SGG name-only reference;
   financials empty; CUI is ngo-only.
2. **CUI collision** — same as (1) but `alsoKinds: ['company']` → company cross-link.
3. **Sanctioned member** — a `sector_membership` with `sanctionStatus` set.
4. **Sparse org** — only a sector membership, missing county/locality; no services, no
   accreditation, no name-only refs.
5. **Name-only-heavy** — direct-CUI org with MJ/SGG references whose `linkStatus` is
   `review_pending` and a candidate match with confidence 0.62.
6. **Not found** — invalid/unknown CUI → `notFound()`.

Mark mock-rendered surfaces with `DataStatusBadge variant="mock"` during dev.

## UI structure

Top → bottom (trust order). Constrained column `max-w-5xl mx-auto px-6`, 8pt grid.

1. **Breadcrumb:** `ONG-uri / <name>`.
2. **Header band:**
   - Org name (`text-2xl font-semibold tracking-tight`), CUI with `CopyButton`,
     county/locality, `kind` badge (`ONG`).
   - `IdentityConfidenceBadge` (profile-level): `Identitate confirmată prin CUI`
     (direct-CUI) — for an org page this is the default since the anchor is a CUI.
   - If `alsoKinds` includes `company`: inline cross-link "Acest CUI apare și ca firmă
     →" to `/companies/$cui`.
   - `Status badge strip` (`NgoStatusBadge` set): Înregistrat · Acreditat · Furnizor
     licențiat · Utilitate publică · Sub sancțiune. Each badge present only when
     evidence supports it; each links to its section anchor.
3. **Sticky section anchor nav** (left rail on desktop, jump `Select` on mobile). Each
   item shows a state dot: has-data / empty / name-only.
4. **Identity & legal registry (`#identitate`, `#registru`):**
   - Confirmed identity summary.
   - MJ legal-registry: if a name-only reference exists, render it inside the
     "Referințe neconfirmate" zone (see §name-only), NOT as confirmed identity. Show
     registry number, court, legal form, registry status, county/locality, address.
     Do NOT render `document_date`/`document_number`.
   - Section header source chip → MJ snapshot provenance.
5. **Sector memberships (`#sectorial`):** RUEIS rows in a `Table` — sector
   (plain-language "Economie socială"), certificate number/date, `valid_until` +
   derived validity, status. **`sanctionStatus`**, when present, rendered first as a
   prominent `NgoStatusBadge variant under_sanction` + a `ReviewSignalBadge`-style
   neutral note with source+date. Section source chip → ANOFM RUEIS snapshot.
6. **Accreditations (`#acreditari`):** ANOFM employment-service accreditations —
   registration code, accreditation number, `valid_from`→`valid_until`
   (`ValidityTimeline` + tabular fallback), status, county/locality. Plain-language
   "Acreditat pentru: servicii de ocupare". Section source chip → ANOFM snapshot.
7. **Social services provided (`#servicii`):** provider header (provider type, license
   number, status, address) then licensed services `Table` — service name, type
   (plain language), code, county/locality, capacity, license number,
   `valid_from`→`valid_until` + validity state. `StaleSnapshotNotice` with the
   MMuncii snapshot date. Link "Vezi toți furnizorii din <județ> →" to
   `/ong-uri/servicii?county=<county>`. Section source chip → MMuncii snapshot.
8. **Public utility (`#utilitate`):** SGG recognition. Since SGG is name-only, render
   in the "Referințe neconfirmate" zone with `link_status`. Show recognizing
   authority + `hg_number` ("Recunoscut de utilitate publică prin HG nr. X") when
   present; suppress empty `hg_date`/`order_number`/`recognition_year`.
9. **Financials (`#financiar`):** see `anaf-financial-enrichment-section.md`. Today
   renders the placeholder "Date financiare în curs de actualizare" with
   `DataStatusBadge variant="partial"`. Never omitted.
10. **Public funding (`#fonduri`):** see `public-funding-cross-links.md`. In MVP-1
    renders the section frame + `RelatedLinksRail` (company/ANAF/public-entity/
    procurement/PNRR/territory) using CUI/SIRUTA links; full money-flow content is
    Next-3.
11. **Referințe neconfirmate (name-only zone):** amber-bordered region grouping MJ +
    SGG references with `UnconfirmedRecordCard` + `IdentityConfidenceBadge` (neconfirmat
    / candidat). Explanatory `PrivacyBoundaryNotice`: "Aceste înregistrări provin din
    registre publice și nu au fost asociate unui CUI confirmat." Candidate matches
    (from `link_review_cases` with confidence) labeled "Posibilă potrivire" with the
    confidence shown.
12. **Evidence trail (`#dovezi`):** collapsible (`Collapsible`/`Accordion`) list of all
    `EvidenceRecord`s; see `evidence-trail-source-citations.md`. Open by default if
    `?evidence=1`.

## Component reuse and proposed new components

- **Reuse:** `Badge`, `Table`, `Accordion`/`Collapsible`, `Tooltip`, `Breadcrumb`,
  `CopyButton`, `Skeleton`, `Alert`, `ScrollArea`, `Button`; entity profile patterns
  from `src/components/entities/views`.
- **Consume (built elsewhere):** `IdentityConfidenceBadge` (MVP-4),
  `SourceCitationChip` + `SourceProvenanceDrawer` (MVP-3), `FreshnessBadge`,
  `StaleSnapshotNotice`, `DataStatusBadge`, `PrivacyBoundaryNotice`,
  `UnconfirmedRecordCard`, `RelatedLinksRail`.
- **New (owned here):**
  - `NgoStatusBadge` (set) — derived status pills; built on `Badge`. Variants:
    `registered`, `accredited`, `licensed_provider`, `public_utility`,
    `under_sanction`, plus validity `active|expiring|expired`. Color + icon + text;
    `aria-label`; clickable to section anchor.
  - `ValidityTimeline` — `valid_from→valid_until` bar with active/expiring/expired
    states and a tabular fallback (required for a11y). Reused by discovery.
  - `NgoProfileSectionNav` — sticky anchor nav with per-section state dots.

## Interactions

- Click a status badge → smooth-scroll to its section + set `?tab=`.
- Click a section header source chip → open `SourceProvenanceDrawer` for that snapshot.
- Expand/collapse evidence trail → toggles `?evidence=1`.
- "Acest CUI apare și ca firmă →" → `/companies/$cui`.
- "Vezi toți furnizorii din <județ> →" → `/ong-uri/servicii?county=<county>&from=profil`.
- Candidate match "Posibilă potrivire" → opens the relevant review-case detail (drawer)
  showing compared fields + confidence; never auto-navigates as if confirmed.
- Keyboard: anchor nav and badges are buttons/links; drawer focus-trapped.

## Loading, empty, error, partial, stale states

- **Loading:** route `pendingComponent` shows the page skeleton (header skeleton +
  section skeletons) — reuse `Skeleton` and the centered dot loader pattern from
  DESIGN_PRINCIPLES for blocking loads.
- **Empty (per section):** sections with no rows render `EmptyState` with a precise
  message, e.g. "Nicio acreditare ANOFM înregistrată pentru acest CUI." Financials
  empty → "Date financiare în curs de actualizare" (partial).
- **Partial:** missing county/locality → "Localitate necunoscută"; missing
  certificate/accreditation fields → "—" with the field still labeled.
- **Stale:** social-services section always shows `StaleSnapshotNotice` with the
  snapshot date; `FreshnessBadge` on each cited section.
- **Error:** unknown/invalid CUI → `notFound()` with an NGO-specific 404 ("Nu am găsit
  o organizație cu acest CUI." + link back to `/ong-uri`). Per-section fetch failure
  (when live) → inline `Alert` "Nu am putut încărca această secțiune" + retry, without
  failing the whole page; URL stays intact.

## Accessibility and i18n

- Section anchor nav is a labeled `nav` with current-section indication; all badges
  have text + `aria-label`; decorative icons `aria-hidden`.
- Tables keep `<th scope>`; `ValidityTimeline` has an adjacent tabular fallback.
- Drawer is focus-trapped with heading + close.
- All copy via Lingui. Romanian primary; expand ONG/CUI/RUEIS/ANOFM/MMuncii/MJ/SGG/HG
  on first use or via tooltip. Locale-aware dates/numbers/capacity. Confidence shown as
  a percentage with locale formatting.
- Copy guardrails: `Identitate confirmată prin CUI` vs `Referință din registru —
  identitate neconfirmată`.

## Privacy, provenance, and source-citation behavior

- Every section header has a `SourceCitationChip` → provenance drawer/page; no claim
  without an adjacent provenance path.
- Name-only MJ/SGG never appear in the confirmed column; they live in the references
  zone with explicit unconfirmed framing and `PrivacyBoundaryNotice`.
- No speculative identity claims; candidate matches require a `link_review_case` with
  confidence and are labeled candidates.
- Sanctions surface prominently with source + date, in neutral language.
- Empty financials are explicit, not omitted, to avoid implying the ONG has no finances.

## Acceptance checklist

- [ ] `/ong-uri/$cui` route with Zod `validateSearch`; invalid CUI → NGO 404; default
      view renders with no params.
- [ ] Header shows name, CUI (+copy), county/locality, ONG kind badge, profile-level
      `IdentityConfidenceBadge`, and CUI-collision company cross-link when applicable.
- [ ] Status badge strip derived from evidence; each badge links to its section and is
      explained in-section; sanctions prominent.
- [ ] All eight content sections render in trust order with per-section source chips;
      financials and public-funding render their placeholder frames.
- [ ] Name-only MJ/SGG content appears only in the separated "Referințe neconfirmate"
      zone with unconfirmed framing.
- [ ] Social-services section shows `StaleSnapshotNotice` with the snapshot date and a
      link to `/ong-uri/servicii?county=…`.
- [ ] Evidence trail collapsible present; `?evidence=1` opens it.
- [ ] All six mock states render correctly; mock surfaces marked with `DataStatusBadge`.
- [ ] `yarn typecheck` clean; Lingui strings extracted/compiled; a presentation smoke
      test exists.

## Non-goals

- No financial charts (Next-1 once seeded); no money-flow Sankey (Next-3).
- No staff link-review actions (advanced `/ong-uri/revizuire`).
- No editing/claiming an organization profile.
- No cross-domain data fetching beyond CUI/SIRUTA link generation in MVP-1.

## Open questions (blockers only)

None. (Non-blocking: exact API grouping per evidence kind is an adapter detail
resolved during integration; financial indicator selection is owned by Next-1.)
