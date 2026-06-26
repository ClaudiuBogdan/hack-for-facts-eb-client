# Feature: References / citation graph

> MVP-5 · the **Referințe** tab of the Act page. Reads
> `docs/design/legal/design.md` (§3 routes, §5 URL state, §6 components, §7 data
> model). The ~1.1M-edge graph made navigable, with resolution honesty.

## Feature owner profile

Frontend feature implementer with light data-visualization experience (a small
directed mini-graph in SVG/visx; tabular fallback). Strong attention to
resolution/confidence honesty — this is the domain's primary trust surface.

## Summary

Two-direction reference navigation: **outgoing** edges (what this act modifies /
abrogates / completes / approves) and **incoming** edges (what modifies it).
Each edge shows its relation, resolution, and confidence. Resolved edges link to
the target act/external act; unresolved/ambiguous edges render as **"potrivire
posibilă"** with the raw cited text and candidates — never as a hard link. A
small directed mini-map summarizes the immediate neighborhood and expands to a
fuller view.

## Facts / Decisions / Assumptions

- **Fact:** `legal.act_references` carries `relation` (modifica, abroga,
  completeaza, suspenda, aproba, rectifica, face-referire, respinge),
  `target_class`, `target_act_id` / `target_external_act_id`, `target_fragment`,
  `resolution` (unique, cluster, alias, ambiguous, unresolved, external),
  `confidence`, `candidates`, `resolver_version`. The graph is document-scoped.
  `legal.external_acts` holds EU/treaty/pre-1989 targets. MCP
  `get_legal_act_links` exists. (`legal.md` §5, §13 MVP-5, §8.)
- **Fact:** Presenting an `ambiguous`/`unresolved`/`external` reference as a hard
  link is the single biggest UX risk; resolution vocab is explicit. (`legal.md`
  §15, §17.)
- **Decision:** Resolved (`unique`/`cluster`) → link to the target Act page (or a
  read-only external-act detail for `external`). `ambiguous`/`unresolved` →
  non-link "potrivire posibilă" card showing `target_raw`, `candidates`, and
  `CitationConfidenceBadge`. (`design.md` P2.)
- **Decision:** Default `dir=all` (both columns visible); filters by relation and
  resolution. The mini-map shows the act node + immediate in/out neighbors,
  relation-colored, with an "Extinde graficul" expand to a `Sheet`/`Dialog`
  larger view. A **tabular fallback** (the two columns) is always present and is
  the accessible source of truth. (`design.md` §10.)
- **Decision:** This feature builds the shared `CitationConfidenceBadge` and
  `RelationChip` (referenced by features 3 and 4).
- **Assumption:** edge counts can be large; the columns paginate / "load more";
  the mini-map caps at a small neighbor count (e.g., top 12 by confidence) with a
  "vezi toate" affordance. The full lineage graph explorer (ADV-4) is out of
  scope.

## Route and URL state

- Route: `/legislatie/acte/$id/referinte`.
- Search params: `dir?` = `out` | `in` | `all` (default `all`), `rel?`
  (repeatable relation), `res?` (repeatable resolution), `page?`/`pageSize?` for
  the columns, plus inherited `highlight?` (edge id).

## Data contract and mock states

Consumes `ReferenceEdge[]` (`design.md` §7), split by `direction`. External-act
target shape:

```ts
type ExternalActTarget = {
  externalActId: string
  label: string                   // "Directiva 2014/24/UE"
  kind: 'eu-directive' | 'eu-regulation' | 'treaty' | 'pre-1989' | 'other'
  url: string | null
}
```

Mock states:
- **Both directions populated** — outgoing modifică/abrogă, incoming several
  modificări.
- **Unresolved-heavy** — several `ambiguous`/`unresolved` edges with candidates.
- **External targets** — an EU directive reference (`external`).
- **Incoming-only** / **outgoing-only**.
- **Empty** — no references.

## UI structure

```
Tab header: "Referințe" + dir toggle (Toate | Iese | Intră) + relation filter +
  resolution filter
CitationGraphMiniMap (compact directed neighborhood; relation-colored; expand)
Two columns (tabular fallback = accessible source of truth):
  "Ce modifică acest act" (outgoing)        "Ce îl modifică" (incoming)
  edge row:
    [RelationChip: relation + direction]  → {targetLabel}  [LegalStatusBadge]
    [CitationConfidenceBadge: resolution + confidence]  · {targetFragment}
  unresolved row (non-link):
    [RelationChip]  "potrivire posibilă"  raw: "{targetRaw}"
    candidates: {label (score)} …  [CitationConfidenceBadge: ambiguous]
Each column paginates / load-more.
```

## Component reuse and proposed new components

- Reuse: `Tabs`/`toggle-group` (dir), `Select`/`multi-select` (filters),
  `Badge`, `Tooltip`, `Sheet`/`Dialog` (expanded graph), `Table` or list,
  `Pagination`, `EvidenceLink`.
- New: `ReferencesPanel` (two columns), `ReferenceEdgeRow`,
  `CitationConfidenceBadge` (resolution + confidence; shared), `RelationChip`
  (relation + direction; shared), `CitationGraphMiniMap` (SVG/visx directed
  mini-graph + tabular fallback). No heavy graph dependency for MVP.

## Interactions

- Dir toggle and relation/resolution filters update URL + the visible edges.
- Resolved edge click → target Act/external page; unresolved candidate click →
  the candidate Act page (still labelled as a candidate, opens with
  `?from=referinte`).
- Mini-map node hover highlights the corresponding column row; "Extinde" opens
  the larger neighborhood view.
- `highlight` flashes the referenced edge.

## Loading / empty / error / partial / stale states

- **Loading:** skeleton columns + mini-map placeholder.
- **Empty:** `empty-state` "Acest act nu are referințe înregistrate."
- **Error:** inline alert + retry.
- **Partial:** unresolved/ambiguous edges always shown as non-links with raw
  text + candidates (this is the core partial state); resolver_version shown in
  the evidence drawer.
- **Stale:** `FreshnessBadge` from Act provenance; resolver version visible.

## Accessibility and i18n

- The two columns (tabular) are the accessible source of truth; the mini-map is
  augmenting and has the same data available in text. Relation + resolution
  conveyed by chip text + icon, not color alone. Keyboard navigable rows and
  expand control; expanded graph in a focus-managed dialog.
- Lingui macros; relation labels in Romanian (modifică/abrogă/completează/
  suspendă/aprobă/rectifică/face referire/respinge); acronyms expanded.

## Privacy / provenance / source-citation

- P2 is the defining rule: unresolved is never a hard link. Every edge exposes
  resolution + confidence + raw target text + `resolver_version` via the evidence
  drawer (P1). External targets clearly marked as outside the domestic corpus.
  Neutral relation vocabulary only — no wrongdoing framing.

## Acceptance checklist

- [ ] `/legislatie/acte/$id/referinte` shows outgoing + incoming edges from mock
      with relation, resolution, confidence.
- [ ] `ambiguous`/`unresolved`/`external` edges render as "potrivire posibilă"
      with raw text + candidates, never as hard links.
- [ ] Resolved edges link to target Act/external pages; dir + relation +
      resolution filters work via URL.
- [ ] Mini-map present with a tabular fallback as the accessible source of truth.
- [ ] `CitationConfidenceBadge` + `RelationChip` shipped as shared components.
- [ ] `yarn typecheck` passes; strings use Lingui macros.

## Non-goals

- Full interactive lineage graph explorer with export (ADV-4); promoting
  `external_citation_edges` candidate lane (kept out of canonical references).

## Open questions (blockers only)

None.
