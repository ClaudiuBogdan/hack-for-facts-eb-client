# Feature: Parliament bill cross-link

> High-value next · in the Act page `RelatedLinksRail` (and a compact strip on
> the Rezumat tab). Reads `docs/design/legal/design.md` (§3 routes, §4 layout,
> §6 components, §7 data model).

## Feature owner profile

Frontend feature implementer (React 19 + TanStack Router + shadcn/ui + Lingui)
familiar with the existing parliament feature, since the link data and
vocabulary already live there.

## Summary

Closes the accountability loop: from an act, link back to its **originating
parliamentary bill** and show the **promulgation-decree chain** (bill → adopted
law → promulgation decree → MO publication). Lets a reader jump from "this is the
law" to "here is how it was made", and vice-versa from the bill page.

## Facts / Decisions / Assumptions

- **Fact:** The parliament bill GraphQL already returns `actLinks {
  relationshipKind, resolutionStatus, confidenceLabel, legalAct { actId, title,
  actType } }`; the mapper derives the adopted law via `relationshipKind ===
  'becomes_law' && resolutionStatus === 'linked'`
  (`src/features/parliament/api/graphql/parliament-*.ts`). So **bill → act** is
  already modeled and rendered on the parliament side; this feature adds the
  **act → bill** reverse direction. (`legal.md` §6, §7.)
- **Fact:** `bill_act_links` cross-domain coverage is ~93.7% without MO; MO
  `mo_lifecycle_edges` `promulga` grounds the promulgation decree; 7,260
  promulgation decrees vs 7,922 indexed lege. Not all acts have a bill.
  (`legal.md` §5, §6, §7.)
- **Decision:** The cross-link uses the same `relationshipKind` /
  `resolutionStatus` / `confidenceLabel` vocabulary as parliament, surfaced via
  `CitationConfidenceBadge`. Only `linked`/high-confidence links are presented as
  navigable; lower-confidence/unlinked are shown as "posibil corelat" with the
  confidence label, never a hard link. (`design.md` P2.)
- **Decision:** The act → bill link targets the existing route
  `/parlament/proiecte/$billId` with `?from=legislatie&highlight={actId}` to
  preserve back-context. The bill → act direction (already on the parliament
  side) should be pointed at `/legislatie/acte/$id` once it ships (handoff note
  to parliament; not built here). (`design.md` §3/§4.)
- **Decision:** The promulgation-decree chain renders as a compact ordered strip:
  Proiect → Lege adoptată → Decret de promulgare → Publicare în MO, each step
  linking where a resolved target exists. Steps with no resolved target are shown
  but non-navigable.
- **Assumption:** an `act → bill` query is needed (the reverse of the existing
  bill `actLinks`); the adapter provides it. If the reverse query is not yet
  available, the feature degrades to showing only the promulgation/MO chain from
  `act_status_events` (promulgare/aprobare) + the MO publication — still useful,
  and clearly labelled when the bill link is absent.

## Route and URL state

- Lives on `/legislatie/acte/$id` (rail + Rezumat strip). No own route.
- Outbound links carry `?from=legislatie` (and `?highlight={actId}` to the bill).

## Data contract and mock states

Consumes `ActBillLink` (`design.md` §7):

```ts
type ActBillLink = {
  billKey: string
  billTitle: string
  relationshipKind: string         // becomes_law | ...
  resolutionStatus: string         // linked | candidate | unlinked
  confidenceLabel: string          // high | medium | low
  promulgationDecree: {
    actId: string | null; label: string; moIssueId: string | null
  } | null
}
```

Mock states:
- **Linked, full chain** — bill linked (high), promulgation decree resolved, MO
  issue present → all steps navigable.
- **Linked, no decree** — bill linked but no promulgation decree (e.g., OUG path)
  → chain shows aprobare instead of promulgare.
- **Candidate** — `resolutionStatus: 'candidate'`, medium confidence → "posibil
  corelat", non-link, confidence shown.
- **No bill** — `billLink: null` → show only the promulgation/MO chain from
  status events; note "fără proiect parlamentar asociat".
- **MO-only act** — no bill, decree shown only if present.

## UI structure

```
In RelatedLinksRail:
  "Proiect de lege de origine"
  {billTitle}  [CitationConfidenceBadge: resolutionStatus + confidenceLabel]
  → /parlament/proiecte/{billKey}?from=legislatie&highlight={actId}
  (candidate → non-link "posibil corelat")

Compact promulgation chain (Rezumat strip):
  [Proiect] → [Lege adoptată] → [Decret de promulgare] → [Publicat în MO]
  each step links to its resolved target (bill / act / decree act / MO issue);
  unresolved steps non-navigable, labelled.
```

## Component reuse and proposed new components

- Reuse: `Badge`, `CitationConfidenceBadge` (feature 5), `Tooltip`, `Separator`,
  `Button`/`Link`, `empty-state`. `RelatedLinksRail` (shared).
- New: `ActBillCrossLink` (rail block) + `PromulgationChain` (the ordered strip).

## Interactions

- Click the bill link → parliament bill page (new context preserved via params).
- Click a chain step → its resolved target; unresolved steps are inert with a
  tooltip explaining why ("țintă nerezolvată").
- Confidence badge tooltip explains the link basis (relationshipKind +
  resolution).

## Loading / empty / error / partial / stale states

- **Loading:** rail block skeleton.
- **Empty (no bill):** "Fără proiect parlamentar asociat" + the
  promulgation/MO chain if any; never invent a bill.
- **Error:** inline notice in the rail block; the rest of the Act page is
  unaffected.
- **Partial (candidate):** "posibil corelat" non-link with confidence (P2).
- **Stale:** confidence label + resolution shown; the bill page carries its own
  freshness.

## Accessibility and i18n

- Links labelled; confidence conveyed by badge text+icon; chain steps are an
  ordered, keyboard-navigable list with clear current/inactive states (not
  color-only). Lingui macros; acronyms (OUG/OG, MO, decret) expanded.

## Privacy / provenance / source-citation

- Cross-domain joins are evidence-led: show *why* the act and bill are linked
  (relationshipKind + resolutionStatus + confidence), per `README.md` provenance
  rules and `design.md` P2. Candidate/low-confidence links are never hard links.

## Acceptance checklist

- [ ] Act page shows the originating bill link (when present) with confidence,
      routing to `/parlament/proiecte/$billId?from=legislatie&highlight={actId}`.
- [ ] Candidate/unlinked relationships render as "posibil corelat" non-links with
      confidence.
- [ ] The promulgation chain renders ordered steps, linking resolved targets and
      showing unresolved steps as inert.
- [ ] "No bill" and "MO-only" states render without fabricating a bill.
- [ ] `yarn typecheck` passes; strings use Lingui macros.

## Non-goals

- Building the full cross-domain lifecycle view (bill → votes → act →
  promulgation → MO → amendments) (ADV-5); modifying the parliament-side
  rendering (a handoff note, not in scope here).

## Open questions (blockers only)

None. (If the reverse act→bill query is not yet served, the feature degrades to
the promulgation/MO chain as specified — no blocker.)
