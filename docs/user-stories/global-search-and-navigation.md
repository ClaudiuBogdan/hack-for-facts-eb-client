### Title

As a user, I want a fast global entity search and clear navigation, so that I can jump between entities and features quickly.

### Context

Components: `FloatingEntitySearch`, `EntitySearchInput`, `AppSidebar`, `MobileSidebarFab`.

### Actors

- All users

### User Flow

1. Trigger floating search via FAB or `mod+k`.
2. Type and select a result to navigate.
3. Use sidebar to navigate primary sections.

### Acceptance Criteria

- Given keyboard shortcut, when pressed, then search opens with focus.
- Given a selection, when chosen, then navigate to entity page.
- Given mobile, when FAB tapped, then search opens.

### Municipality matches

In the unfiltered navigation search, a locality name or prefix of at least three
letters can put a municipality, town, or commune first. For example, Sibiu and
sib put Municipiul Sibiu first. The lookup ignores case and Romanian diacritics.
Exact names outrank prefixes. Matches with the same exact name show their
counties. If only prefixes match, a municipality is preferred to a town or commune.

The [navigation search](../../src/features/landing/hooks/use-landing-search.ts)
requests public organizations with the existing isUat filter in parallel with the
regular results. It checks the entire typed phrase against the locality name and
deduplicates by entity ID. CUI and other numeric lookups, searches with filter
chips, and fixed-scope pickers use their regular search. The regular results still
work when the UAT lookup fails, times out, or returns from a different index generation.

### Error and Empty States

Search results empty state and retry guidance.

### Analytics & Telemetry

Optional capture of searches and navigation targets.

### Accessibility

Modal focus trap; ARIA labels.

### Performance

Debounced queries; cached recent results.

### Open Questions

- Persist recent searches across sessions?


