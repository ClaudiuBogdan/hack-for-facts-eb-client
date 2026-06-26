# Feature: Sanctions / Enforcement tab

> Next-4. Tab `?tab=sanctiuni` on `/intreprinderi-publice/$cui`. Lane: AMEPIP
> enforcement HTML tables (34 ÎP + 6 APT rows) — **built but deploy-gated**.
> Privacy-critical: the `responsible` person/role field must never be shown. Read
> with `enterprise-profile.md`, `source-lineage-verify.md`, and `../design.md`.

## Feature owner profile

Frontend feature implementation subagent (React 19 + TypeScript + shadcn/ui +
Lingui). Must enforce the privacy rule (no person field) and the neutral-signal
language guardrail.

## Summary

Surfaces AMEPIP enforcement actions under OUG 109/2011 against the enterprise
(and, separately, against its controlling authority) as a chronological
list/timeline: sanction date, legal basis (OUG 109 article), sanction text, and
source URL. Small, high-signal dataset. Gated until the sanctions lane deploys.

## Facts, decisions, assumptions

- Fact (UX §5 Lane 6, §13 Next-4): Two static AMEPIP HTML tables — ÎP sanctions (34
  rows, keyed by enterprise CUI) and APT sanctions (6 rows, keyed by authority
  CIF). Inventory shows ~40 sanction_events. Built, deploy-gated.
- Fact (UX §5): `enforcement_actions` columns: `side ('ip'|'apt'), cui, apt_cui,
  enterprise_name, apt_name, sanction_date, legal_basis (OUG 109 art.), sanction,
  source_url, source_row_number`.
- Fact (UX §5/§6/§15 — HARD RULE): The `responsible` person/role field is stored
  **raw-only** and is privacy-gated. There is **no person column in serving** and
  it must **never** be displayed. Only sanction text, date, legal basis, source.
- Decision: The tab shows two clearly separated groups: "Sancțiuni împotriva
  întreprinderii" (`side='ip'`) and "Sancțiuni împotriva autorității tutelare"
  (`side='apt'`), so users do not conflate an authority sanction with an
  enterprise sanction.
- Decision: Language is neutral signal, not a verdict — "sancțiune AMEPIP
  înregistrată", with the legal basis as a factual chip. No "vinovat"/"ilegal"
  framing (README + `ReviewSignalBadge` neutrality).
- Decision: Legal-basis chips (OUG 109 art. X) get a tooltip expanding the article
  context where a short gloss is available; the raw article reference is always
  shown as text too.
- Assumption: `sanction` free text may be long; render full text (not truncated to
  the point of losing meaning), with a "vezi mai mult" expand for very long
  entries.

## Route and URL state

- Fact: Panel of `/intreprinderi-publice/$cui`; addressed by `?tab=sanctiuni`. No
  extra search params (small dataset, chronological).

## Data contract and mock states

`fetchEnforcementActions(cui)` → `EnforcementSet | null` (mock↔live by
`soe-sanctions`).

```ts
type EnforcementSet = {
  cui: string
  enterpriseActions: readonly EnforcementAction[]   // side='ip'
  authorityActions: readonly EnforcementAction[]    // side='apt'
  lineage: SourceLineage                            // AMEPIP sanctions table
}

type EnforcementAction = {
  side: 'ip' | 'apt'
  cui: string | null
  aptCui: string | null
  enterpriseName: string | null
  aptName: string | null
  sanctionDate: string | null          // ISO
  legalBasis: string | null            // OUG 109 art.
  sanction: string | null              // public sanction text — NO person field
  sourceUrl: string | null
  sourceRowNumber: number | null
  // NOTE: there is intentionally NO `responsible` field in this contract.
}
```

- Decision: The UI type deliberately omits `responsible`. If a live API ever
  returns it, the mapper drops it at the boundary (defense in depth) so it cannot
  reach the component.

### States

- **Gated** (default until lane live): `LaneStatusPanel` — "Sancțiuni AMEPIP (OUG
  109/2011) — în curând".
- **Live, has sanctions**: enterprise group + authority group timelines.
- **Live, none**: `EmptyState` "Nicio sancțiune AMEPIP înregistrată pentru această
  întreprindere." (Absence is the common, reassuring case — state it plainly.)
- **Live, authority-only**: enterprise group shows the empty state; authority group
  renders its rows (clearly labelled as authority sanctions).
- **Loading**: timeline skeleton.
- **Error**: inline `Alert` + retry.
- **Stale**: AMEPIP snapshot note in lineage badge.

## UI structure

Within the tab panel:

1. **Section: Sancțiuni împotriva întreprinderii** (`side='ip'`):
   - A chronological list/dot-timeline (`divide-y` rows or a simple vertical
     timeline). Each row: `sanction_date` · `LegalBasisChip(legal_basis)` ·
     sanction text · "Sursă ↗" link + row-level lineage.
2. **Section: Sancțiuni împotriva autorității tutelare** (`side='apt'`), visually
   separated and labelled, with the APT name shown.
3. **Privacy note** (small, always present when sanctions render): "Din motive de
   protecție a datelor, nu afișăm persoana responsabilă; arătăm doar sancțiunea,
   data, temeiul legal și sursa." (Makes the boundary explicit — README.)
4. **Legend / glossary**: "Ce este OUG 109/2011 și de ce contează sancțiunile
   AMEPIP?" expandable.

## Component reuse and proposed new components

- Reuse: `Badge` (legal-basis chips), `Tooltip`, `Button`, `accordion`, `alert`,
  `skeleton`, `empty-state`, `divide-y` list; `SourceLineageBadge`,
  `DataStatusBadge`, `LaneStatusPanel`, and the `ReviewSignalBadge` neutrality
  pattern (README) for the sanction marker.
- New: `EnforcementTimeline`, `LegalBasisChip` (OUG 109 art. → tooltip),
  `SanctionsPrivacyNote`.

## Interactions

- Click "Sursă ↗" → AMEPIP sanctions table URL (new tab).
- Hover a legal-basis chip → article gloss (article ref also shown as text).
- Expand "vezi mai mult" → full sanction text for long entries.
- `SourceLineageBadge` → provenance drawer (includes `source_row_number`).

## Loading, empty, error, partial, stale states

See Data contract → States. Invariant: NO person/responsible field is ever
rendered; "no sanctions" is stated plainly as the reassuring default, not an error.

## Accessibility and i18n

- Timeline is a semantic list; dates are `<time>`; legal-basis chips pair text with
  any color.
- The privacy note is real visible text, not only a tooltip.
- All copy Lingui; expand OUG 109/2011, AMEPIP, ÎP, APT on first use; dates via
  `Intl.DateTimeFormat('ro-RO')`.

## Privacy, provenance, and source-citation behavior

- **HARD RULE**: never display the `responsible` person/role — enforced by both the
  UI type (no field) and the mapper (drops it if present). (Fact UX §6/§15.)
- Neutral-signal language only; the sanction is presented as a recorded AMEPIP
  action with its legal basis, never as an adjudication of guilt (README).
- Enterprise vs. authority sanctions are clearly separated to avoid misattribution.
- `Sursă: AMEPIP` label + per-row lineage.

## Acceptance checklist

- [ ] Gated until the sanctions lane is live (panel + badge), then renders the
      enterprise and authority timelines separately.
- [ ] Each sanction shows date, legal basis (OUG 109 art.), text, and a source
      link; NO person/responsible field appears anywhere.
- [ ] The UI type omits `responsible` and the mapper drops it if returned.
- [ ] "No sanctions" renders as a plain, reassuring statement, not an error.
- [ ] Neutral language; enterprise vs authority clearly distinguished.
- [ ] Privacy note is visible (not tooltip-only); Lingui-wrapped; `yarn typecheck`
      clean.

## Non-goals

- No person/responsible exposure — ever.
- No verdict/wrongdoing framing or scoring.
- No recurrence analytics here (that is `/analiza`, UX §14).

## Open questions (blockers only)

- **Blocker**: prod serving contract for the sanctions lane (PC-3 deploy unblock).
  The privacy rule is already settled (no person field). Until deploy, the tab ships
  gated/mock.
