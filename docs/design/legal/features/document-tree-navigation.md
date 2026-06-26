# Feature: Document tree navigation

> High-value next · the **Structură** tab of the Act page. Reads
> `docs/design/legal/design.md` (§3 routes, §5 URL state, §6 components, §7 data
> model).

## Feature owner profile

Frontend feature implementer with accessible-tree experience (ARIA
`tree`/`treeitem`, keyboard navigation). Should build on `Collapsible`/
`ScrollArea`; no new dependency required.

## Summary

Renders an act's internal structure (`document_nodes`) as a collapsible outline
— titlu → capitol → secțiune → articol → alineat → literă/punct → anexă/notă —
synced with the node text and deep-linkable down to a specific article/alineat
(e.g., "Articolul 29^1"). Serves the domain expert who needs the exact provision,
with source-span evidence.

## Facts / Decisions / Assumptions

- **Fact:** `legal.document_nodes` carries `path`, `node_type` (preambul, carte,
  titlu, parte, capitol, sectiune, articol, alineat, litera, punct, anexa, nota),
  `order_index`, `char_start/end`, `splitter_version`. MCP `get_legal_node`
  exists. (`legal.md` §5, §13 next, §8.)
- **Decision:** The tree is keyed to the **canonical** document by default; it
  follows the header `?versiune=` selector (feature 9) so switching versions
  re-keys the tree. (`design.md` P7.)
- **Decision:** Each node is deep-linkable via `?nod={path}`; selecting a node
  scrolls/flashes its text and updates the URL. The node `path` is the stable
  identity (agent-friendly, shareable). (`design.md` §5.)
- **Decision:** Split view on desktop (tree outline left, node text right);
  stacked + collapsed on mobile (P8). Char spans (`char_start/end`) are shown as
  source-span evidence in the node header.
- **Assumption:** node text may be large; render lazily per expanded branch and
  virtualize long article lists if needed. Where node text is absent
  (extraction gap), show the node label + an "text indisponibil" note, not a
  blank.

## Route and URL state

- Route: `/legislatie/acte/$id/structura`.
- Search params: `nod?: string` (node `path` deep-link), inherited `versiune?`
  and `highlight?`.

## Data contract and mock states

Consumes the `DocumentNode` tree (`design.md` §7): `path`, `nodeType`, `label`,
`orderIndex`, `charStart/end`, `text`, `children[]`.

Mock states:
- **Deep tree** — multi-level (titluri → capitole → articole → alineate).
- **Flat** — articole only (no chapters).
- **Deep-linked node** — `?nod=` resolves to a specific alineat, expanded +
  scrolled.
- **Missing text** — a node with `text: null` (extraction gap).
- **Empty** — no nodes (act has no parsed structure).

## UI structure

```
Tab header: "Structura actului" + a small node search/filter (jump to article)
Split:
  Tree outline (left, scrollable): Collapsible nodes, node_type icon + label,
    selected node highlighted, char-span shown on the active node
  Node text (right): heading {label} + char span evidence + prose;
    "copiază linkul către {label}" (copies ?nod= URL)
Mobile: outline collapses; selecting a node shows its text below.
```

## Component reuse and proposed new components

- Reuse: `Collapsible`, `Accordion`, `ScrollArea`, `Input`/`Command` (jump-to),
  `Button`, `copy-button`, `Tooltip`, `empty-state`, `EvidenceLink`.
- New: `DocumentTree` (ARIA tree), `DocumentNodeText`. No graph/charting dep.

## Interactions

- Expand/collapse branches; click node → select + `?nod=` + scroll text.
- Jump-to-article input filters/locates a node by label/number.
- Copy-link copies the deep `?nod=` URL.
- Keyboard: arrow up/down move between visible nodes, right/left expand/collapse,
  Enter selects (standard tree semantics).

## Loading / empty / error / partial / stale states

- **Loading:** outline skeleton + text skeleton.
- **Empty:** `empty-state` "Structura acestui act nu a fost parsată."
- **Error:** inline alert + retry.
- **Partial:** nodes with `text: null` show "text indisponibil" with the char
  span still shown; never blank or fabricated.
- **Stale:** `splitter_version`/freshness surfaced in the evidence drawer.

## Accessibility and i18n

- Proper ARIA `tree`/`treeitem` with `aria-expanded`, roving tabindex, full
  keyboard support. Node text region is a labelled landmark. Node-type conveyed
  by icon + text. Lingui macros; node-type labels in Romanian; "Articolul",
  "alineatul", "litera" formatted with locale-aware numbering.

## Privacy / provenance / source-citation

- Char spans (`char_start/end`) + `splitter_version` are the provenance for the
  exact text (P1). Tree follows the canonical/selected version explicitly so the
  user always knows which expression they are reading (P7).

## Acceptance checklist

- [ ] `/legislatie/acte/$id/structura` renders the node tree from mock with
      collapsible branches and synced node text.
- [ ] `?nod={path}` deep-links to a specific article/alineat (expanded +
      scrolled); copy-link produces that URL.
- [ ] Tree is keyboard navigable with correct ARIA tree semantics.
- [ ] Missing-text and empty states render without fabrication.
- [ ] Tree follows the header version selector.
- [ ] `yarn typecheck` passes; strings use Lingui macros.

## Non-goals

- Semantic/provision-level RAG retrieval (ADV-1); inline diffing between versions
  (that is the version-compare in feature 9).

## Open questions (blockers only)

None.
