# Landing search — choosing the combobox

**Status:** open decision · **Measured:** 7 September 2026 · **Prototype:**
`/development/landing/home-refs?v=…` (`yarn dev` only)

Four implementations of the hero search, on the same page, differing only in the
combobox underneath the field. Compare them at
`?v=landing`, `?v=landing-cmdk`, `?v=landing-downshift`, `?v=landing-baseui`, or
two at a time with `&layout=side`.

## What is being compared

All four share the data layer and the presentation, so nothing below is a
difference in how the search *works* or how it *looks*:

- `useSearchResults` — one 250ms debounce, one query key, `keepPreviousData`,
  the seven-state machine (`idle · short · pending · loading · results · empty ·
  error`), the `live`/`local` source flag, and the analytics gating that keeps
  stand-in rows out of telemetry.
- `useEntitySelection` — navigation via `buildEntitySelectionPath`, with
  `EntitySearchSelected` fired only for live results.
- `home-refs.search-parts.tsx` — the row, the diacritic-folded match marks, the
  place line, the header, the skeleton, the messages, the `aria-live`
  announcements, the ⌘/Ctrl hint.

What varies is the **interaction**: what Escape means, when Enter may act, how
the highlight travels and scrolls, and where the popup goes when there is no
room below the field. Those are the three things the comparison was asked for —
scroll, Enter/Escape, position.

## Measured behaviour

Run `node tmp/compare.mjs` against a local dev server to reproduce. Every cell
below is an assertion in that script, not a judgement.

| | **A** hand-rolled + Radix | **B** cmdk | **C** downshift + Radix | **D** Base UI |
|---|---|---|---|---|
| New dependencies | none | none | `downshift` | `@base-ui/react` |
| Rows are real anchors | ✅ | ❌ | ✅ | ✅ |
| Cmd-click opens a new tab | ✅ | ❌ **navigates away in the same tab** | ✅ *(needs `preventDownshiftDefault`)* | ✅ |
| `preload="intent"` on rows | ✅ | ❌ | ✅ | ✅ |
| Tab dismisses the popup | ✅ | ✅ | ✅ | ✅ |
| Escape closes, then clears | ✅ *(hand-written; Radix's own Escape must be disabled)* | ✅ *(intercepted before cmdk sees it)* | ✅ **library default** | ✅ *(one `reason === 'escape-key'` test)* |
| Enter-selects-first gated on freshness | ✅ hand-written | ✅ hand-written | ✅ `stateReducer` | ✅ `autoHighlight={false}` + gate |
| Highlight travels, focus stays in input | ✅ | ✅ | ✅ | ✅ |
| `aria-activedescendant` tracks the row | ✅ | ✅ | ✅ | ✅ |
| Active row scrolled into view | hand-written `useEffect` | automatic | automatic (`compute-scroll-into-view`) | automatic |
| At a 560px viewport | **flips above** the field | **flips above** | **flips above** | **shrinks in place** (fits, 5px to spare) |
| Popup height bounded by | `--radix-popover-content-available-height` | same | same | `--available-height` |
| Approx. gzip | 0 (Radix already present) | ~4 kB | ~32 kB | ~41 kB upper bound (unminified parts) |

## What each one is actually like

### A — hand-rolled combobox, Radix Popover as the layer only

The current implementation. Nothing is inherited, so nothing is a surprise, and
every one of the seven states was drawn deliberately. The price is that the ARIA
is ours: the `aria-controls` defect — the field claiming an expanded popup while
pointing at an id that only existed in the `results` state — was ours to ship and
ours to find. So was the Escape regression that adopting Radix introduced, where
Radix's document-level handler flushed React state before the input's own
handler ran and one press both closed and cleared.

Reach for this only if the widget needs to do something no library models.

### B — cmdk

The zero-cost option on paper: already a dependency, already wrapped at
`src/components/ui/command.tsx`, and Popover + Command is shadcn's canonical
combobox. **Rule it out anyway.** cmdk is built to filter and rank a list it
owns, and every problem follows from using it for a list it does not:

- `shouldFilter={false}` is mandatory, or it re-ranks the server's answer and
  silently drops rows — a CUI search matching an institution whose *name* lacks
  those digits returns nothing.
- `Command.Item` claims the click and turns it into `onSelect`, so rows cannot be
  anchors. Measured: **Cmd-click navigates away in the current tab.** For a
  research surface whose readers compare institutions side by side, that is not a
  missing nicety — it destroys the reader's stated intent, and it also costs
  `preload="intent"`.

### C — downshift + Radix

The WAI-ARIA 1.2 combobox pattern written down, paired with the positioning it
deliberately does not do. Two things this session had to hand-write and then
repair are simply its defaults:

- Two-stage Escape *is* its reducer:
  `{ isOpen: false, highlightedIndex: -1, ...(!state.isOpen && { inputValue: '' }) }`.
- Scroll-into-view arrives with it, and is overridable.

`getInputProps()` owns every `aria-*` attribute on the field, which is both the
advantage — they cannot drift apart — and the limit: the `aria-controls` fix A
needed is downshift's decision, not ours. Modified clicks need
`preventDownshiftDefault` on the native event or downshift swallows them; that is
one documented line, and with it Cmd-click works.

Two libraries for one widget.

### D — Base UI Autocomplete

From the Radix team, and the only candidate whose API was designed for exactly
this widget. `filter={null}` is a first-class server-driven mode rather than
filtering switched off. Every change carries a `reason` — `escape-key`,
`item-press`, `link-press`, `outside-press`, `focus-out` — which turns two-stage
Escape into a single comparison instead of a fight with the layer. Items take a
`render` prop, so an option genuinely *is* a TanStack `Link` (the DOM shows
`<a role="option">`), and Cmd-click works without intervention.

**One behavioural difference worth deciding on deliberately:** where Radix
*flips* the panel above the field when it will not fit, Base UI *shrinks* it in
place and reports the room it found. Both are defensible; shrinking keeps the
popup attached to the field, flipping keeps the row count. Shrinking only works
if `--available-height` is consumed **on the popup itself** — bounding an inner
scroller leaves the popup at its natural height, hanging 78px below the fold.
That cost a measurement to find.

## Recommendation

**C (downshift) or D (Base UI). Not A, not B.**

Independent research reached the same shortlist and ranked downshift first,
because this widget's rules — fresh-versus-stale results, two-stage Escape,
Enter gated on freshness, router navigation with modified clicks — are
application state-machine rules rather than combobox rules, and `stateReducer`
is the most direct way to express them.

Measurement here nudges the other way. Both pass every behavioural check, but D
does it with **one** library instead of two, and its `reason` on every event is
the thing that would have prevented this session's two worst bugs outright. The
argument for C is maturity: downshift is nine major versions old and Base UI is
at 1.8.0, published three days before this was written.

Two facts to weigh that are not about behaviour:

- `@base-ui-components/react` is **deprecated** and renamed to `@base-ui/react`.
  The deprecated name is still installable and still resolves to an older
  `1.0.0-rc.0`, which is an easy mistake — this document exists partly because I
  made it.
- Base UI is the heaviest of the four, and adopting it means adopting a second
  primitive library alongside Radix, or committing to migrating.

**If nothing else is decided, keep A.** It passes every check and costs no
dependency. It is simply the one where the next defect of this kind will also be
ours to find.

## Reproducing

```sh
yarn dev
node tmp/compare.mjs        # the table above
node tmp/radix-probe.mjs    # Tab / portal / keyboard / Escape / collision, variant A
```

The GraphQL API is a separate repo and usually not running here, so the
prototypes fall back to `PREDEFINED_ENTITIES` under `import.meta.env.DEV`, and
every row from it is labelled **Date locale · API indisponibil** in the dropdown
header and in the screen-reader announcement, per `DESIGN.md` §Mock-First
Contract. Live results are labelled nothing, because they need no caveat.
