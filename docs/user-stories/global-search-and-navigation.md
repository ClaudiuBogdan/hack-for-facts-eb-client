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
counties. A town hall row reads “Primărie · Jud. Sibiu” in Romanian and
“Town hall · Sibiu County” in English. București is shown by name alone in the
place label. If only prefixes match, a municipality is preferred to a town or commune.

The [navigation search](../../src/features/landing/hooks/use-landing-search.ts)
loads a compact directory on the first eligible search, alongside the single
Meilisearch request. The directory stays in memory for the rest of the page
session. Regular results stay available while the directory loads or if it fails.
If loading takes more than two seconds, Enter can use the regular first result
while the directory continues to load. A late directory can still promote a
match for the current query. When a municipality is already in the API response,
search moves that row up and keeps its live details, filling in a missing county.
Other directory matches link directly to their public profiles. Each promoted
organization appears once by CUI. CUI lookups, filter chips, fixed-scope pickers,
and API answers without a verified generation use the regular ordering.

The [directory generator](../../scripts/generate-uat-search-directory.mjs) takes
names, types, counties, and CUIs from the dated boundary asset. It checks the
CUI against the SIRUTA mapping and includes Municipiul București separately from
its six sectors. Run the generator after publishing a new boundary revision,
passing its path with `--source`. Run it with `--check` to verify the checked-in
directory against that source.

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


