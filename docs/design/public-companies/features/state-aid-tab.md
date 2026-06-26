# Feature: State Aid tab

> Next-3. Tab `?tab=ajutor-de-stat` on `/intreprinderi-publice/$cui`. Lane: RegAS
> (Consiliul Concurenței) — **built but deploy-gated**; per-CUI award hit count to
> be reconciled on first live run. Read with `enterprise-profile.md`,
> `source-lineage-verify.md`, and `../design.md`.

## Feature owner profile

Frontend feature implementation subagent (React 19 + TypeScript + shadcn `Table` +
Lingui). Care with the amount category/subcategory model and the unreconciled hit
count.

## Summary

A transparent per-enterprise state-aid ledger: each RegAS award with measure name,
scheme reference, financier, amount (category + subcategory), aid intensity,
granted date, objective, region, and a link to the measure PDF. A small "total
aid" summary contextualizes the table. Gated until the RegAS lane deploys.

## Facts, decisions, assumptions

- Fact (UX §5 Lane 4, §13 Next-3): Source — bounded per-CUI queries over the ~1,342
  AMEPIP CUIs against `regas.consiliulconcurentei.ro`. Built, deploy-gated.
- Fact (UX §5): `state_aid_awards` columns: `cui, award_key, beneficiary_name,
  caen, granted_at, measure_name, scheme_ref, enterprise_size, objective, region,
  funded_activities, amount_category + amount_category_value, amount_subcategory +
  amount_subcategory_value, instrument, intensity, financier, id_masura,
  pdf_masura, source_url`.
- Fact (UX §5/§6): Hit count is unreconciled — experimental captures showed 132
  non-empty per-CUI caches vs 34 aid hits; the real distinct-CUI award count must
  be confirmed on first live run. The UI must not present a count as authoritative
  before reconciliation.
- Decision: Amounts use the RegAS category/subcategory model verbatim — show
  `amount_category` + its value and `amount_subcategory` + its value as labelled
  bands; do NOT invent a single "total amount" if the source provides ranges/
  categories. If a numeric value exists, show it with RON formatting; if only a
  category band exists, show the band label.
- Decision: A "total ajutor" summary sums only awards that have an unambiguous
  numeric value, and is explicitly labelled "(doar valorile numerice cunoscute)"
  so it is never read as the complete total. (Honest aggregation — README.)
- Decision: This is exact-CUI money-flow evidence labelled `Sursă: RegAS`; it is
  not wrongdoing — copy uses neutral terms ("ajutor de stat primit", "schemă"),
  never accusatory language (README provenance).
- Assumption: `scheme_ref` vs `measure_name` distinction needs a plain-language
  gloss ("schemă" = framework, "măsură" = specific instrument) per UX §11.

## Route and URL state

- Fact: Panel of `/intreprinderi-publice/$cui`; addressed by `?tab=ajutor-de-stat`.
- Decision: Optional `sort` for the award table in this route's search schema
  (`aidSort=granted:desc|amount:desc|financier:asc`); default `granted:desc`. No
  separate route.

## Data contract and mock states

`fetchStateAid(cui)` → `StateAidLedger | null` (mock↔live by `soe-regas-state-aid`,
the existing catalog id).

```ts
type StateAidLedger = {
  cui: string
  awards: readonly StateAidAward[]
  summary: {
    numericTotalRon: number | null     // sum of known numeric values only
    awardCount: number
    reconciled: boolean                // false until first live run reconciles hits
  }
  lineage: SourceLineage               // RegAS
}

type StateAidAward = {
  awardKey: string
  beneficiaryName: string | null
  caen: string | null
  grantedAt: string | null             // ISO
  measureName: string | null
  schemeRef: string | null
  enterpriseSize: string | null
  objective: string | null
  region: string | null
  fundedActivities: string | null
  amountCategory: string | null
  amountCategoryValue: number | null
  amountSubcategory: string | null
  amountSubcategoryValue: number | null
  instrument: string | null
  intensity: string | null             // may be a % or a band
  financier: string | null
  idMasura: string | null
  pdfMasura: string | null             // measure PDF link
  sourceUrl: string | null
}
```

### States

- **Gated** (default until lane live): `LaneStatusPanel` — "Ajutor de stat primit
  (sursa RegAS) — în curând".
- **Live, has awards**: summary + award table.
- **Live, no awards**: `EmptyState` "Nu am găsit ajutoare de stat pentru această
  întreprindere în RegAS." + lineage. (Absence is meaningful and must be stated
  plainly, not as an error.)
- **Live, unreconciled**: when `summary.reconciled === false`, show a small
  `DataStatusBadge` `partial` + note "Numărul exact de ajutoare se confirmă la
  prima rulare live."
- **Loading**: summary + table skeleton.
- **Error**: inline `Alert` + retry.
- **Stale**: RegAS snapshot note in lineage badge.

## UI structure

Within the tab panel:

1. **Summary band**: `awardCount` ("{n} ajutoare de stat"), `numericTotalRon`
   ("Total cunoscut: {RON} (doar valorile numerice)"), a `reconciled` badge when
   partial. Labelled `Sursă: RegAS`.
2. **Awards table** (semantic `<table>`, horizontally scrollable on mobile):
   columns — Dată (`granted_at`) · Măsură (`measure_name`) · Schemă (`scheme_ref`)
   · Finanțator (`financier`) · Sumă (category + subcategory bands/values) ·
   Intensitate · Obiectiv/Regiune (secondary) · PDF. Sortable by date / amount /
   financier. Each row links `pdf_masura` ("Deschide măsura ↗") and carries
   row-level lineage.
3. **Glossary line**: "Ce este o schemă vs. o măsură de ajutor de stat?" expandable
   with a plain-language gloss.

## Component reuse and proposed new components

- Reuse: `Table`, `Badge`, `Tooltip`, `Button`, `accordion`, `alert`, `skeleton`,
  `empty-state`, `Select` (sort); `SourceLineageBadge`, `DataStatusBadge`,
  `LaneStatusPanel`.
- New: `StateAidSummary`, `StateAidTable`, `lib/state-aid-amount.ts` (renders the
  category/subcategory amount model safely).

## Interactions

- Sort the table → `aidSort` param + client re-sort.
- Click "Deschide măsura" → `pdf_masura` (new tab).
- Hover a measure/scheme → glossary tooltip.
- `SourceLineageBadge` → provenance drawer (RegAS source URL + measure id).

## Loading, empty, error, partial, stale states

See Data contract → States. Invariant: "no awards" is a stated finding, not an
error; the total is never presented as complete when only numeric values are
summed.

## Accessibility and i18n

- Table is semantic with `<th scope>`; amount bands are text, not color-only.
- Sort control + PDF links labelled; external links have `aria-label` + sr-only
  new-tab note.
- All copy Lingui; expand RegAS, "ajutor de stat", "schemă", "măsură", "intensitate"
  on first use; amounts via `Intl.NumberFormat('ro-RO', { style: 'currency',
  currency: 'RON' })` when numeric.

## Privacy, provenance, and source-citation behavior

- Neutral, non-accusatory language (README): "ajutor de stat primit", never
  "subvenție nejustificată" or similar.
- `Sursă: RegAS` label + per-award lineage; not merged with AMEPIP/BVB.
- No person-level data.

## Acceptance checklist

- [ ] Gated until the RegAS lane is live (panel + badge), then renders the ledger.
- [ ] Award table shows measure, scheme, financier, amount (category +
      subcategory), intensity, date, and a measure-PDF link.
- [ ] "Total cunoscut" sums only numeric values and is labelled as partial; an
      unreconciled hit count shows a `partial` badge + note.
- [ ] "No awards" renders as a stated finding with lineage, not an error.
- [ ] Neutral language throughout; `Sursă: RegAS` labelled and not merged.
- [ ] Lingui-wrapped; `yarn typecheck` clean.

## Non-goals

- No cross-domain money-flow Sankey (UX §14 Advanced-5).
- No sector/county aid concentration analytics here (that is `/analiza`).
- No invented single total when the source gives categories/ranges.

## Open questions (blockers only)

- **Blocker**: prod serving contract for the RegAS lane AND the reconciled
  distinct-CUI award count (Fact UX §5/§6). Until both, the tab ships gated/mock
  and labels counts as unreconciled.
