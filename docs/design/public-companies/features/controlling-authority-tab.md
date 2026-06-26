# Feature: Controlling Authority / Ownership tab

> Next-1. Tab `?tab=autoritate` on `/intreprinderi-publice/$cui`. Lane: S1001 +
> `json_apt` — **built but deploy-gated** (not yet live). Design to degrade
> gracefully (Pattern E). Read with `enterprise-profile.md`,
> `source-lineage-verify.md`, and `../design.md`.

## Feature owner profile

Frontend feature implementation subagent (React 19 + TypeScript + shadcn/ui +
Lingui). Must implement both the gated/coming-soon state and the live state behind
the `LaneAvailability.controllingAuthority` flag.

## Summary

Answers the domain's #1 question — "who controls this state-owned enterprise?" —
with a clear controlling-authority block: APT name, APT CUI, central vs. local
subordination, decoded authority type, county, enterprise status, and S1001 list
class, plus a breadcrumb link to the authority's budget profile at
`/entities/$aptCui`. Honestly flags when the APT CUI does not resolve in the public
entities registry. Until the lane deploys, the tab renders a `LaneStatusPanel`.

## Facts, decisions, assumptions

- Fact (UX §5 Lane 2, §13 Next-1): Source is S1001 "Lista unică a ÎP" (ANAF static
  PDF, ~1,773 rows: 366 central + 1,407 local) + AMEPIP `json_apt` inline JSON
  (1,312 records, 524 IP CUIs). Built, deploy-gated.
- Fact (UX §5): Serving `controlling_authorities` columns: `cui, apt_cui,
  apt_name, subordination ('central'|'local'), apt_type_id (1=central ministry,
  2=central agency, 3=local council, 4=county council, 5=inter-community
  association), county, county_abbr, enterprise_name, enterprise_status,
  enterprise_status_descriptive (Faliment/Lichidare/Reorganizare/Operativa),
  list_class (A–F flags), media_doc_count, from_s1001, from_json_apt, source_url,
  s1001_object_id`. Plus `controlling_authority_links` (APT CUI →
  `core.public_entities`).
- Fact (UX §6): S1001 (~1,773) is broader than AMEPIP (1,342) — non-matches are
  data-quality flags, not errors.
- Fact (UX §7): Link, never merge — the authority is `core.public_entities`
  evidence reached by APT CUI; the tab must label it `Autoritate tutelară`, not
  merge it into the enterprise identity.
- Decision: `apt_type_id` is decoded to RO labels via a `lib/apt-type.ts` map; the
  raw id is never shown to users (acronym/code guardrail).
- Decision: When `controlling_authority_links` shows the APT CUI does not resolve
  in `core.public_entities`, the breadcrumb link is disabled and a note explains
  "Autoritatea nu are încă o pagină de buget asociată" — honest, not a broken link.
- Decision: Provenance is dual — show whether a row came from `from_s1001`,
  `from_json_apt`, or both, with a `SourceLineageBadge` per source.
- Assumption: Ownership % is NOT in this lane (Fact UX §6 — biggest qualitative
  gap, gated on a future lane). The tab reserves a labelled "Cotă de proprietate —
  indisponibil momentan" slot but promises nothing.

## Route and URL state

- Fact: Panel of `/intreprinderi-publice/$cui`; no new route. Addressed by
  `?tab=autoritate`.
- Decision: No additional search params. The tab's data is a function of the CUI.

## Data contract and mock states

Part of `PublicEnterpriseProfile.authority` (design.md §6) plus a fuller payload
fetched when the tab opens (mock↔live by `soe-controlling-authority`).

```ts
fetchControllingAuthority(cui: string): Promise<ControllingAuthorityDetail | null>
type ControllingAuthorityDetail = {
  cui: string
  aptCui: string | null
  aptName: string | null
  subordination: 'central' | 'local' | null
  aptTypeId: 1 | 2 | 3 | 4 | 5 | null
  aptTypeLabel: string                  // decoded RO label
  county: string | null
  countyAbbr: string | null
  enterpriseStatus: string | null
  enterpriseStatusDescriptive: string | null  // Faliment/Lichidare/Reorganizare/Operativa
  listClass: readonly string[]          // A–F flags
  mediaDocCount: number                 // count of governance docs for this APT
  fromS1001: boolean
  fromJsonApt: boolean
  s1001ObjectId: string | null
  resolvesInPublicEntities: boolean     // from controlling_authority_links
  authorityHref: string | null          // '/entities/$aptCui' when resolvable
  // Optional: siblings under the same APT (for "portfolio" peek)
  siblingCount: number | null
  sources: readonly SourceLineage[]     // S1001 and/or json_apt
}
```

### States

- **Gated** (default until lane live): `LaneStatusPanel` — "Cine controlează
  această întreprindere? Această secțiune folosește Lista unică a ÎP (S1001) și
  datele AMEPIP json_apt și va fi disponibilă după promovarea sursei." +
  `DataStatusBadge` `gated`. The tab label carries a `gated` badge.
- **Live, resolved**: full authority card + working budget breadcrumb.
- **Live, unresolved APT**: card renders, breadcrumb disabled + explanatory note.
- **Live, no authority** (CUI in AMEPIP but not in S1001/json_apt): `EmptyState`
  "Nu există o autoritate tutelară înregistrată pentru această întreprindere în
  sursele curente." + lineage.
- **Loading**: card skeleton.
- **Error**: inline `Alert` + retry.
- **Stale**: S1001/json_apt snapshot note in the lineage badge.

## UI structure

Within the tab panel:

1. **ControllingAuthorityCard** (framed record):
   - `Autoritate tutelară` label + `aptName` (or "necunoscut").
   - Chips: subordination (`Centrală` / `Locală`), `aptTypeLabel`, county.
   - Meta: `APT CUI {aptCui}`, enterprise status descriptive.
   - `list_class` flags decoded with tooltips ("Clasa A–F din S1001").
   - Breadcrumb: `Întreprindere → Autoritate tutelară → Buget` with a `Link` to
     `/entities/$aptCui` (or disabled + note).
   - Per-source `SourceLineageBadge` (S1001, json_apt).
2. **Provenance note**: which source(s) contributed (`Din S1001`, `Din AMEPIP
   json_apt`, or both).
3. **Authority portfolio peek** (optional, if `siblingCount`): "Această autoritate
   supraveghează {n} întreprinderi" → link to the listing filtered by this APT
   (`/intreprinderi-publice?subordination=…&apt=…` once that facet is live).
4. **Ownership reserved slot**: muted "Cotă de proprietate — indisponibil
   momentan", with a one-line explanation (Fact UX §6). No promise of a date.

## Component reuse and proposed new components

- Reuse: `card`, `Badge`, `Tooltip`, `breadcrumb`, `Button`, `alert`, `skeleton`,
  `empty-state`; `SourceLineageBadge`, `DataStatusBadge`, `LaneStatusPanel`
  (from `source-lineage-verify.md`).
- New: `ControllingAuthorityCard`, `lib/apt-type.ts` (id→label),
  `lib/list-class.ts` (A–F → tooltip text).

## Interactions

- Click breadcrumb/authority link → `/entities/$aptCui` (preserve `from` context).
- Hover `list_class` flag → tooltip explanation.
- Click portfolio peek → filtered listing.
- `SourceLineageBadge` → provenance drawer (S1001 PDF / json_apt source URL).

## Loading, empty, error, partial, stale states

See Data contract → States. Invariant: the tab never renders a broken authority
link; unresolved APT CUIs degrade to a labelled disabled state.

## Accessibility and i18n

- Decode every code (`apt_type_id`, `list_class`) to visible RO text; never show
  raw ids.
- Breadcrumb is semantic; disabled link uses `aria-disabled` + visible note.
- All copy Lingui; expand APT, ÎP, S1001, AMEPIP on first use.

## Privacy, provenance, and source-citation behavior

- Link, never merge (Pattern C): authority is labelled evidence with its own
  lineage; `resolvesInPublicEntities` honesty when the CUI does not match.
- Dual-source provenance shown explicitly.
- No person-level data (board/administrator rosters are out of scope — Fact UX §6,
  privacy-gated).

## Acceptance checklist

- [ ] Until the lane is live, the tab shows a `LaneStatusPanel` and a `gated` tab
      badge — never an empty/error panel.
- [ ] When live, the card shows APT name, decoded subordination + type, county,
      enterprise status, and decoded `list_class`.
- [ ] Budget breadcrumb links to `/entities/$aptCui` when resolvable; otherwise a
      disabled link + explanatory note.
- [ ] Source(s) (S1001 / json_apt) are shown with per-source lineage badges.
- [ ] No raw codes shown; ownership % slot reserved without promising data.
- [ ] Lingui-wrapped; `yarn typecheck` clean.

## Non-goals

- No ownership % or shareholding network (gated on a future lane — UX §14
  Advanced-6).
- No board/administrator rosters (privacy-gated, out of scope).
- No authority budget rendering here (that lives on `/entities/$aptCui`).

## Open questions (blockers only)

- **Blocker**: prod serving contract for the S1001/json_apt lane (PC-3 deploy
  unblock + backend module ownership, UX Open Q2/Q3). Until resolved, the tab ships
  in gated/mock mode. No UX blocker beyond the data deploy.
