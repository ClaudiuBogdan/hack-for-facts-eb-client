# Landing search — choosing the combobox

**Status:** decided — **Base UI**, 7 September 2026 · **Prototype:**
`/development/landing/home-refs` (`yarn dev` only)

Four implementations of the hero search were built on the same page and measured
against each other. Base UI won; the other three have been deleted, and
`downshift` was uninstalled. This document is kept so the question is not
reopened from scratch, and so the losing arguments stay available if the
decision is ever revisited.

The variant URLs below (`?v=landing-cmdk` and friends) no longer exist. The
measurements were taken while they did.

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
| At a 560px viewport | **flips above** the field | **flips above** | **flips above** | **shrank in place** (fits, 5px to spare) — but see the correction below |
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

**One behavioural difference, and a correction to how it was first written
down.** Radix *flips* the panel above the field when it will not fit. Base UI
also reports the room it found and exposes it as `--available-height`, which
only helps if that variable is consumed **on the popup itself** — bounding an
inner scroller leaves the popup at its natural height, hanging 78px below the
fold. That cost a measurement to find.

What was written here first, on the strength of the 560px measurement, was that
Base UI *shrinks rather than flips*. **That is wrong, and it was wrong when it
was written.** Base UI shrank at 560px, so a conditional behaviour was recorded
as a categorical one on the strength of a single observation. It flips like
anything else once the room below runs out — sixteen pixels of extra chrome
above the field was enough to send it above, on a viewport where it had
previously stayed below. What is true is narrower and less interesting: given
room, it prefers to stay and shrink.

The distinction matters for anything joined to the field, because a panel that
flips does not merely move — it inverts, squaring the wrong corners and
dropping the wrong border, so the join appears upside down rather than
relocated.

The first answer to that was to stop it flipping: `collisionAvoidance={{ side:
'none' }}`, pinning it below and letting `--available-height` shrink it, at what
was written up as the cost of "fewer rows in a short window." **That was a guess
stated as a measurement, and it was wrong twice over.** Measured across 900,
640 and 560, the pinned panel showed exactly the same rows as the floating one —
5, 4, 3 — because at no gap it starts 8px higher and recovers what it loses.
And at 520, 440 and 400, where the field sits against the bottom edge, the
pinned panel rendered **entirely below the window: zero rows reachable**, where
the floating one flipped and showed all five. The pin was not a trade-off. It
was a defect in the cases it existed to handle.

What works is the opposite instinct: let it flip, and let the join follow.
`data-side` on the popup and `data-popup-side` on the input drive which edge
squares off and which border is dropped, so a panel above the field joins at the
field's top edge exactly as one below joins at its bottom. Measured at all six
heights, the joined variant now matches the floating variant's row count on
every one, with a seam gap of ±0.5px and a 0px border and radius on whichever
edge faces the field.

## Decision — D, Base UI

Chosen on 7 September 2026 after using all four. Both shortlisted candidates
passed every behavioural check, and D does it with **one** library instead of
two, with a `reason` on every event that would have prevented this session's two
worst bugs outright.

Three defects found only by using it, all now fixed:

- **Enter with nothing highlighted did not select the first result.** Base UI
  does not auto-highlight (correctly — auto-highlighting makes Enter act on a
  guess), so the freshness-gated convenience has to be added on the input.
- **`aria-controls` pointed at a list that was not rendered.** Base UI aims it at
  `Autocomplete.List`, and four of the seven states draw a message instead of
  rows — the same defect the hand-rolled version shipped, arriving through the
  library's wiring rather than ours. The list is now always mounted.
- **Tab skipped the clear button**, which Base UI gives `tabIndex={-1}`.
  Defensible, since Escape twice also clears, but a visible control a keyboard
  user cannot reach is the interface lying about itself. Overridden to `0`.

One regression the swap introduced and the tests could not see: the enter
animation was lost, because Base UI transitions off `data-starting-style` rather
than using the keyframe classes the Radix popover carried. Restored as a 150ms
fade and 4px rise, with reduced motion honoured by an inline `transition: none`.

### The reasoning at the time

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

### What the choice cost

`@base-ui/react` is a second primitive library alongside Radix, which the rest of
the app still uses for every other floating layer. That is a real inconsistency
and the strongest argument that was made against D. It is worth revisiting if
Base UI turns out to suit more than this one widget — or reversing, if it does
not.

## Still open — does the panel float or attach?

The library is settled; the shape of the panel is not. Two variants of the same
page, at `?v=landing` and `?v=joined`:

| | **floating** (`landing`) | **joined** (`landing-joined`) |
|---|---|---|
| Gap below the field | 8px | none |
| Field's bottom corners | rounded | squared while the panel is open |
| Border between them | two, 8px apart | one — the divider under the header |
| Focus indicator | `ring` blue on the field | `foreground/60` neutral on the pair, plus the lift |
| Shadow | `shadow-md`, panel only | `shadow-lg`, on field and panel alike |
| Enter animation | fade + 4px rise | fade only |
| Out of room below | flips above the field | flips too — the join follows to the field's top edge |

Everything else is shared — the rows, the seven states, the header, the
keyboard, the announcements — so the two differ in the attachment and nothing
else. `joined` is one prop on `LandingSearch` switching six class strings, not a
second component, which is what keeps the comparison about one thing.

Three things fall out of the join rather than being decided separately:

- **The rise has to go.** A panel attached to the field that rises as it fades
  reads as sliding out from behind the field, which undoes the join in the one
  moment the reader is watching it happen.
- **Focus has to be one treatment, and it cannot be the blue.** This took three
  attempts and the two failures are worth keeping, because they fail in opposite
  directions.

  Matching the panel *to* the focused field came first: a blue outline around
  the whole assembly. Correct in structure, wrong in weight — it is a great deal
  of colour to spend saying "focused" on a design whose entire premise is one
  quiet surface.

  So the second attempt turned both borders grey and suppressed the ring once
  the panel opened, reasoning that an open panel attached to the field says
  "focused" at ten times the size. That fixed the colour and broke something
  worse: **the indicator appeared on focus and vanished the moment the reader
  typed.** Focus had not moved. The interface said it had. A focus indicator
  that comes and goes under the reader is a worse defect than a loud one, and it
  is the kind that only shows up when someone uses the thing rather than looks
  at a screenshot of it.

  What works is a neutral: `border-foreground/60` on the field and the panel
  together, with `shadow-lg`, applied identically whether the panel is open or
  shut. Nothing appears, nothing disappears, and the outline traces the pair
  because the seam-side borders are already gone.

  How light it can go is a measured limit rather than a matter of taste, because
  a focus indicator owes 3:1 against what is next to it. `foreground/60` is
  rgb(121): 4.35:1 against the card and 3.49:1 against the resting border.
  `/55` is 3.74 and **3.00** — sitting exactly on the floor — and everything
  below it fails. Lightening this by eye is fine down to /60 and is a
  correctness change after it.

  The shadcn ring is suppressed in both states rather than one. It is a
  box-shadow, so it outlines the field alone and cannot follow the join; the
  border replaces it.
- **The join has to be side-aware**, for the reason in the correction above.
  Preventing the flip instead is worse than the problem it solves.

The header row survives in both, and joined it does more work: the field stands
directly on it with no seam line of its own, so the divider *under* the header
is the only line between the query and the answers. Drawing both — a seam under
the field and a divider under the header, 45px apart around a tinted strip —
boxes the field off as its own object again. Tinted, the strip is the shoulder
the field stands on. Dropping the header was considered and rejected: it carries
the CUI column label, and it carries the stand-in-data badge, which is not
optional under `DESIGN.md` §Mock-First Contract.

Measured at 1×, the field's border and the panel's land on the same column at
the same value either side of the seam, so the pair reads as one outline rather
than as two that nearly line up.

## Reproducing

```sh
yarn dev
node tmp/final-check.mjs    # navigation, Escape→Enter, Tab→clear, Cmd-click, motion
```

`tmp/compare.mjs` produced the four-way table and no longer runs, since three of
the variants it drove are gone.

The GraphQL API is a separate repo and usually not running here, so the
prototypes fall back to `PREDEFINED_ENTITIES` under `import.meta.env.DEV`, and
every row from it is labelled **Date locale · API indisponibil** in the dropdown
header and in the screen-reader announcement, per `DESIGN.md` §Mock-First
Contract. Live results are labelled nothing, because they need no caveat.
