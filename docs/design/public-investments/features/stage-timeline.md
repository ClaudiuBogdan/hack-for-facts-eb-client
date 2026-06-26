# Feature — Stage Timeline (High-value next: N4, post-backfill)

> Read with `design.md` (shared shapes/routes/guardrails), `ux.md`, and
> `objective-detail-hub.md` (this renders a section inside that page's
> `Prezentare` tab). **Design now, enable on backfill** — it ships in a
> permanently-visible but data-gated state.

## Feature owner profile

Detail-section front-end subagent. Builds a reusable vertical timeline component
that activates when historical stage snapshots exist, and renders a clear
"istoric indisponibil momentan" state until then.

## Summary

A per-objective vertical timeline of implementation-stage snapshots
(`Stadiu obiectiv` over time): each entry is a snapshot date + normalized stage
bucket + raw stage text + evidence. Today only one (latest) snapshot exists, so
the component ships **disabled with an honest empty state** and activates
automatically once historical backfill lands — answering "how has this project
progressed over time?"

## Facts / Decisions / Assumptions

- **Fact (UX R6, §5.1):** only the latest snapshot is projected today — **no
  time series yet**. Historical backfill is an open extraction improvement
  (Anghel ~12, PNCCRS ~64–70, PNMC ~13 superseded snapshots, UX ADV-2).
- **Fact (UX R3):** `Stadiu obiectiv` is not a clean enum (mixes %, sci-notation,
  free text) → normalize to a bucket, always keep the raw verbatim.
- **Fact:** each `stage_source_facts` row traces to `source_evidence`.
- **Decision:** Renders as a section inside `?tab=prezentare` of objective
  detail; no own route. Reusable component `StageTimeline`.
- **Decision:** Gating is data-driven via
  `DomainDataStatus.historyAvailable` + the count of distinct stage snapshots.
  `historyAvailable === false` OR `stages.length <= 1` → the disabled state. No
  code change needed to enable; it activates when the adapter returns >1
  snapshot.
- **Assumption:** When backfill lands, `stages` arrives ordered with distinct
  `snapshotDate`s; entries with null dates sort to the end under "dată
  necunoscută".

## Route and URL state

- Host route: `/investitii-publice/obiective/$id?tab=prezentare`.
- Shared params used here:

```
stage:  string?   // StageFact.snapshotId to expand/scroll-to (deep-link a snapshot)
dovada: string?   // evidence deep-link (shared)
```

- No new params beyond these; the timeline is a section, not a sub-view.

## Data contract and mock states

Consumes `ObjectiveDetailBundle.stages: readonly StageFact[]` +
`status.historyAvailable` (design.md §6).

```ts
type StageTimelineData = {
  readonly stages: readonly StageFact[]    // ordered; today length 1
  readonly currentBucket: StageBucket       // from the objective row
  readonly currentRaw: string | null
  readonly historyAvailable: boolean
  readonly snapshotDate: string | null      // current snapshot
}
```

- **Mock states (build all, default to disabled):**
  1. `historyAvailable:false`, single snapshot → **disabled state** (the live
     default today): show the current `StageBadge` + raw + "Istoric indisponibil
     momentan. Vom afișa evoluția stadiului când vor fi disponibile snapshot-uri
     istorice."
  2. `historyAvailable:true`, multiple snapshots, monotonic progress
     (Contractat → În execuție → Finalizat) → full active timeline.
  3. multiple snapshots with a **regression** (e.g. Finalizat → În execuție) →
     flagged as a neutral "modificare de stadiu" signal (no wrongdoing language).
  4. snapshots with `necunoscut` buckets + raw free-text → bucket "Necunoscut" +
     raw shown verbatim.
  5. null-date snapshot → grouped under "dată necunoscută".

## UI structure

- **Section header** — "Evoluția stadiului" + a `FreshnessBadge` (current
  snapshot date) + a one-line caveat about snapshot-based history.
- **Disabled state (today's default):** the current `StageBadge` (large) + raw
  stage disclosure + a muted timeline placeholder rail with a single "acum"
  node and the "istoric indisponibil momentan" message. Visually present so the
  capability is discoverable; clearly inert.
- **Active state (post-backfill):** a vertical timeline (newest or oldest first —
  **Decision:** oldest→newest top-to-bottom, "acum" highlighted at the end). Each
  node: snapshot date (`Intl.DateTimeFormat`), `StageBadge` (bucket), raw stage
  text on disclosure, `EvidenceLink`. A connecting rail; the latest node marked
  "actual". A "modificare de stadiu" chip on any non-monotonic transition
  (neutral signal, text+icon).
- **Deep-linked snapshot** (`?stage=`) → that node is scrolled into view and
  briefly highlighted.

## Component reuse and proposed new components

- Reuse: `Badge`, `Tooltip`, `Collapsible` (raw stage disclosure), `Skeleton`,
  `EmptyState`, `copy-button`.
- Shared trust: `FreshnessBadge`, `EvidenceLink`, `SourceProvenanceDrawer`,
  `DataStatusBadge`.
- New PI: `StageTimeline` (the reusable component, with disabled + active
  states), `StageBadge`, `HowToReadData` (stage-label glossary).

## Interactions

- Disabled state: only the raw-stage disclosure + "Vezi dovada" on the current
  node are interactive.
- Active state: each node's raw disclosure + "Vezi dovada"; deep-link a node via
  `?stage=`. Hover/focus shows the transition delta ("Contractat → În execuție,
  {date}").

## Loading / empty / error / partial / stale

- **Loading:** timeline rail skeleton inside the Prezentare tab.
- **Empty / disabled:** the canonical today-state — single/no snapshot →
  "istoric indisponibil momentan" placeholder (this is the expected state, not an
  error).
- **Error:** stage fetch error → inline section error + retry; the rest of the
  Prezentare tab unaffected.
- **Partial:** some snapshots `necunoscut` → bucket + raw shown; null-date
  snapshots grouped; non-monotonic transitions flagged neutrally.
- **Stale:** current snapshot date via `FreshnessBadge`; muted "posibil
  neactualizat" past threshold.

## Accessibility and i18n

- Timeline is an ordered list (`<ol>`) with each node a list item; the rail is
  decorative (`aria-hidden`). Stage state conveyed by text+icon, never color
  alone. Disclosure controls labelled; deep-linked node receives focus.
- Dates via `Intl.DateTimeFormat`; Lingui throughout; stage-bucket labels and
  the "modificare de stadiu" signal localized; raw stage text shown verbatim
  (LTR `code`/quote) with a "text original din sursă" label.

## Privacy / provenance

- Stage facts carry no party identity → no privacy gate. Each node carries
  `EvidenceLink` to its `stage_source_facts` row. The "modificare de stadiu"
  chip is a neutral signal (no wrongdoing implication), consistent with the
  foundation `ReviewSignalBadge` posture.

## Acceptance checklist

- [ ] `StageTimeline` renders inside `?tab=prezentare` of objective detail.
- [ ] With `historyAvailable===false` / single snapshot → disabled "istoric
      indisponibil momentan" state with the current `StageBadge` + raw + evidence.
- [ ] With multiple snapshots → active vertical timeline (oldest→newest, "actual"
      marked), each node dated + bucketed + raw-on-disclosure + "Vezi dovada".
- [ ] Non-monotonic transitions flagged as a neutral "modificare de stadiu".
- [ ] Enabling requires **no code change** — only the adapter returning >1
      snapshot. `?stage=` deep-links a node.
- [ ] Semantic `<ol>`; dates localized; raw stage labeled "din sursă";
      `yarn typecheck` clean; i18n done.

## Non-goals

- Contracted/decontat time series (that is the payments cumulative + ADV-2;
  this timeline is stage-only).
- Fetching/forcing historical snapshots (backfill is an extraction-side task).
- Any wrongdoing inference from a stage regression (neutral signal only).

## Open questions (blockers only)

- None for design. Active-state **data** depends on historical backfill (UX Open
  Q2 / ADV-2); the component ships in the disabled state and self-activates, so
  no design or build decision is blocked.
