# Elections pages: front door, analytics, details

Owner's brief, 28 November 2026: turn the elections prototypes into real pages on Chronos dev, laid
out like legislation and the national budget; keep every prototype tab; design the main page with
the most relevant sections and links to the analytics and details pages.

Prototype: `/development/elections/pagini`. It reads live from the API the dev server points at,
and has four variants: `principal`, `analize-buget`, `analize-legislatie`, `detalii`.

## Decisions

All of these were taken by the owner in the session on 28 November 2026.

| Question | Decision |
|---|---|
| Routes | `/alegeri` (front door), `/alegeri/analize` (analytics), `/alegeri/loc/<SIRUTA>` (place) |
| Analytics head | **The national budget's**: the question as the headline over the lattice; a controls row (county, copy link, one amber caveats marker); a pinned bar of five views; each view's tabs stacked as sections under a jump row |
| Tabs | **All 25 kept.** A tab without served data shows a dashed panel that names what is missing. A tab that is served but not built yet says „În curând" until its change lands |
| Front door bands | **Six bands, as built**: Parlament, Primării și consilii, Președinte, Harta, Prezența, Toate alegerile. Then the start cards and the sources line |
| Front door map | **One map section, with buttons that switch the dataset**: Romania by county, drawn from the INS hub's locality shapes merged per county. The buttons are Primăriile 2024 (most mayoralties), Președintele turul 2 (who led), Prezența turul 2 (five steps) and Europarlamentare 2024 (leading list). Each costs one request. The map by locality waits on the server memo and lives on the analytics Hartă view |
| County councils | The two allocation phases side by side, never summed |
| Independents in lists across places | „independent", without the name; the race's own page keeps the ballot name |
| Presidential band | Ballot names, as served: an independent by name, a party candidate by the party's short name |
| Comparison | 2020 → 2024 now; earlier elections join when they are published |
| Order | Analytics first, with all five views in the bar from the first push, filled view by view (Mandate, Curse, Partide, Prezență, Hartă); then the front door; then the place page |

## Page shapes

- **Front door, `/alegeri`.** Built like the `/legislation` hub and `/national-budget`.
  - **Head:** the way home „Acasă / Alegeri", the headline and lede, the place search (it lands with the
    place page), shortcuts, and a „Ultimele alegeri" card listing the latest ballot days with their turnout,
    each row linked to its election page. The sources line sits at the head's foot.
  - **Body:** the pinned bar, the figures band, the six bands (each with one link onward), then the start cards.
  - **Today's list:** the event list now at `/alegeri` becomes the „Toate alegerile" band. Its only URL key,
    `pagina`, is dropped, because six events fit in one band.
- **Analytics, `/alegeri/analize`.** The URL keys are `tip` (view), `dupa` (tab) and `judet`; `partid` joins with
  the Partide view. Every key is written on every link (the router merge trap). `dupa` scrolls the page to its
  section; the county is read only by the views that take one (Mandate today).
- **Details pages** (an election, a race, a place). Legislation's slim head without the sibling row: the way
  home, the title, one sentence and the sources line. The bodies don't change in this round.

## Shared parts

Per client-dev-polish, 28 November 2026:

- **Import, don't copy:** `HomeSectionNav numbered={false}`, `HomeBand`, `HubSectionHead` (no `index`),
  `HubFiguresBand` (`plain`, `arrow`) and `HubInfoNote`.
- **Coming polish:** client-dev-polish polishes these on `feat/hub-polish-20261128`. The bar gains icons, the
  current-section underline and the phone follow. Merge dev again before every pre-push note.
- **Prototype only:** the prototype's icon bar is a local copy under `/development`.
- **Patterns:** the way home, the hero, the bar and the figures band follow `person-head.tsx` and
  `landing-polish-20261128/SPEC.md`.

## Data rules the pages keep

- Party lines by actor key. The two alliances (ADU, PSD + PNL) are matched by their normalised ballot label.
  The independents are one line, by kind, with the label dropped. Everything else is „Alte partide".
- Missing is never zero: a county without figures is dashed (București in local 2024). National totals say „fără
  București" from `MISSING_SCOPE:county:B`.
- A line with any SUSPECT member carries „defect cunoscut" in its legend.
- Turnout: the served rate where it exists (local, European). Elsewhere, voted ÷ registered from the served
  counts, said in the band's note. Diaspora is included where the source includes it.
- Sources: the official results with the publication's `activatedAt`. No source links until the API names the
  publisher (server ask S6).

## Left to the builder

- Each change: tests, one Sol review, the owner's word, a pre-push note to root. The heads go to the SEO session.
  Root is told before the catalogue extract.
- The wide UAT reads are county-first; the national UAT maps wait for the server memo (root's call).
