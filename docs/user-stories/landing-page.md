### Title

As a visitor, I want to find an entity or start from the domain I care about, and understand where the platform's figures come from, so that I can begin exploring with confidence.

### Context

Route `/` (`src/routes/index.tsx` + `index.lazy.tsx`), feature `src/features/landing/`.
Bands, in order: hero (search, shortcuts, the "Începe de aici" entity panel), national
facts, statement, the grouped index of every surface, provenance, people, promo cards.
The app-wide footer (`src/components/footer/AppFooter.tsx`) follows, with the
drifting horizon scene. Design record: `docs/design/landing/design.md`.

### Actors

- Visitor

### User Flow

1. Page loads server-rendered; on desktop the search field is focused, on a phone it is not.
2. User types an entity name or CUI; suggestions may offer a scope chip (`firma`, `ong`, `primăria`…); results are real links.
3. Alternatively, user clicks a shortcut (achiziții, buget, legislație), an entity in the panel, or an index cell.
4. Scrolling reveals each band as it is reached; the figures count up and the headings decrypt.

### Acceptance Criteria

- Given a desktop viewport, when the page loads, then the search input is focused; on mobile it is not and focusing it scrolls the field to the top.
- Given at least three characters, when results arrive, then Enter opens the first result only once the list answers the current text; Escape closes the list, a second Escape clears the field and its chips.
- Given a scope word in the text, when the suggestion is accepted, then it becomes a chip, the word leaves the text where it did no work, and the results narrow.
- Given the index, when a surface is gated by mock mode, then it is absent rather than badged.
- Given the provenance band, then every coverage figure is derived at render, and the institution count appears only once served by the API — never a hard-coded number.
- Given JavaScript never runs, then every word on the page is in the HTML; no block is server-rendered hidden.
- Given `prefers-reduced-motion`, then no entrance, count-up, scramble, tilt or drift runs.

### Scenarios

- Given the entity panel on desktop, when the red light is pressed, then the panel closes and focus moves to the search field; amber minimises it to a draggable icon that restores it; green opens `/entity-analytics`.
- Given no consent decision stored, when the page has been up for half a second, then the consent card asks once, non-modally, and `×` stores nothing.

### Error and Empty States

Search shows a short hint under three characters, a skeleton while loading, an honest empty state that distinguishes "nothing matches" from "nothing of this kind among the first results", and an error line if the API does not answer.

### Analytics & Telemetry

`entity_search_performed` and `entity_search_selected` (respecting consent). No telemetry for decorative motion.

### Accessibility

One `h1`; each index group is a labelled region with an `h3`; the shortcuts and the footer each expose one navigation landmark; the search follows the combobox pattern with live announcements; targets are at least 24px, 44px rows on a phone.

### Performance

Static except for the search and the institution count; margin field and scene are gated to the viewport; images are AVIF with WebP fallback and lazy.

### Open Questions

- The "Despre proiect" page (`/despre`) and the band link to it.

### References

- `src/features/landing/components/landing-page.tsx`
- `src/features/landing/components/search/landing-search.tsx`
- `docs/design/landing/design.md`, `docs/design/landing-search-comparison.md`, `docs/design/landing-reveal.md`
