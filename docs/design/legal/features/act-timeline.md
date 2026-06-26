# Feature: Act timeline (status + amendments)

> MVP-4 · the **Cronologie** tab of the Act page. Reads
> `docs/design/legal/design.md` (§3 routes, §6 components, §7 data model).

## Feature owner profile

Frontend feature implementer with light data-visualization experience (timeline
layout, no heavy charting library required). Should reuse the parliament
`bill-passage-tracker` / `BudgetCycleTimeline` layout idioms rather than adopt a
new dependency.

## Summary

A chronological view of everything that happened to an act: status events
(modificare, abrogare-totală/parțială, suspendare, încetare-suspendare,
republicare, rectificare, ieșire-din-vigoare) and MO lifecycle events
(promulgare, aprobare-OUG/OG) folded over time, each colored by kind and tagged
with its source plane (Portal vs Monitorul Oficial). It surfaces the event
substrate the backend already derives — the differentiator vs the official
portal.

## Facts / Decisions / Assumptions

- **Fact:** `legal.act_status_events` carries 9+3 event kinds with
  `effective_date`, `source_act_id`, `evidence`, and `event_source` (`portal` |
  `monitorul-oficial`); `legal.act_references` adds dated modificare/abrogare/etc
  edges; `key_dates` from summaries add entry-into-force/expiry. MCP
  `get_legal_act_timeline` exists. (`legal.md` §5, §13 MVP-4, §8.)
- **Fact:** A single scalar status cannot capture simultaneous modify + partial-
  abrogate + suspend, or **future-dated** abrogations; the schema comment calls
  this out. (`legal.md` §15.)
- **Decision:** The badge in the header shows the **folded** status; this
  timeline shows the **full substrate**. Future-dated events are visually
  flagged ("intră în vigoare la …") and ordered by effective date with a
  "viitor" marker. (`design.md` P1; `legal.md` §15.)
- **Decision:** Each event shows a **source chip** (`Portal` vs `Monitorul
  Oficial`) and, where present, a click-through to the modifying act
  (`source_act_id` → `/legislatie/acte/$id`) and/or the MO publication/issue.
  (`legal.md` §13 MVP-4.)
- **Decision:** Default order newest-first with a toggle to oldest-first;
  grouped by year. A horizontal timeline on desktop, a vertical list on mobile
  (P8).
- **Assumption:** event ordering when `effective_date` is null falls back to
  publication/source date; the adapter supplies a resolved sort date.

## Route and URL state

- Route: `/legislatie/acte/$id/cronologie` (`route.tsx` + `route.lazy.tsx` under
  the Act layout; rendered in the shell `<Outlet />`).
- Search params (inherit Act-level + local): `highlight?` (event id to flash),
  `dir?` not used here. Local UI: order toggle and kind filter are local state
  unless deep-linking is needed; if shared, use `ordine?` = `nou` | `vechi` and
  `tip?` (repeatable kind) on this route.

## Data contract and mock states

Consumes `StatusOrReferenceEvent[]` (`design.md` §7). Each event:
`id`, `kind`, `effectiveDate`, `eventSource`, `sourceActId`, `sourceActCitation`,
`targetFragment`, `evidence`, `futureDated`.

Mock states:
- **Rich** — 137 events over years (Codul fiscal): modificări dense, a
  republicare, several promulgare/aprobare-OUG.
- **Sparse** — original publication + promulgare only.
- **Future-dated** — an abrogare with `effectiveDate` in the future, flagged.
- **Mixed-source** — events from both `portal` and `monitorul-oficial`.
- **Empty** — no events beyond creation.

## UI structure

```
Tab header: "Cronologia actului" + order toggle + kind filter (Select/multi)
Desktop: horizontal timeline axis (years) with event nodes; click a node →
  detail popover. Below: a grouped event list (year headers) as the canonical,
  accessible representation.
Mobile: vertical list only (timeline axis hidden).
Event row/node:
  [kind icon + RelationChip/kind label]  {date}  [source chip: Portal | MO]
  "{description}"  → modifying act link (sourceActCitation)  · evidence link
  future-dated → amber "viitor · intră în vigoare la {date}"
```

## Component reuse and proposed new components

- Reuse: layout idioms from `bill-passage-tracker.tsx` /
  `BudgetCycleTimeline.tsx`; `Badge`, `Tooltip`, `Popover`, `Select`/
  `multi-select`, `Separator`, `ScrollArea`, `EvidenceLink`.
- New: `ActTimeline` (axis + grouped list), `TimelineEventRow`, reuse
  `RelationChip` (feature 5; build here if first). Source chip = small `Badge`.

## Interactions

- Click event node/row → popover with full description, evidence link, and
  links to the modifying act + MO publication.
- Order toggle (newest/oldest); kind filter narrows shown events.
- `highlight` param flashes/scrolls to the referenced event.

## Loading / empty / error / partial / stale states

- **Loading:** skeleton timeline rows.
- **Empty:** `empty-state` "Nu există evenimente înregistrate pentru acest act."
- **Error:** inline alert + retry.
- **Partial:** events with missing `effective_date` grouped under "dată
  necunoscută" with their source date noted; never invented dates.
- **Stale:** `FreshnessBadge` from the Act-level provenance.

## Accessibility and i18n

- The grouped event **list** is the accessible source of truth (semantic list +
  year headings); the horizontal axis is decorative/augmenting and keyboard
  users navigate the list. Event kind conveyed by icon + text, not color alone.
- Lingui macros; locale dates; acronyms expanded (OUG/OG/MO).

## Privacy / provenance / source-citation

- Every event carries its `eventSource` chip and an `EvidenceLink` to the source
  (P1). Future-dated events flagged, never silently applied to the header status
  (P-status-drift). No wrongdoing language — neutral event vocabulary only.

## Acceptance checklist

- [ ] `/legislatie/acte/$id/cronologie` renders status + reference + MO lifecycle
      events chronologically from mock, grouped by year.
- [ ] Each event shows kind (icon+text), date, source chip, and a click-through
      to the modifying act/MO where present.
- [ ] Future-dated events are flagged and ordered correctly.
- [ ] Accessible grouped list present; not color-only.
- [ ] `yarn typecheck` passes; strings use Lingui macros.

## Non-goals

- The reference graph (Referințe tab) — this is chronology, not the directed
  graph; they cross-link but are separate features.
- Exporting the lineage (a high-value next, not MVP).

## Open questions (blockers only)

None.
