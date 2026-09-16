# Landing, footer and cookie consent — promotion record

**Status:** promoting, 16 September 2026. Source prototypes:
`/development/landing/home-refs?v=landing` (the page and its footer) and
`/development/privacy/cookies?v=modal` / `?v=page` (consent card and settings
page). Both were settled in the prototype's own notes; the comparisons that
settled them are in [`landing-search-comparison.md`](../landing-search-comparison.md),
[`landing-reveal.md`](../landing-reveal.md) and the module comments carried
over with the code.

## Where the code went

| Prototype | Promoted to |
|---|---|
| `home-refs.refined.tsx` and the bands | `src/features/landing/components/` |
| `home-refs.search*.ts*` | `src/features/landing/components/search/`, `hooks/`, `lib/` |
| `home.data.ts`, `home-refs.national-facts.ts`, `about.people.ts` | `src/features/landing/lib/` |
| `home-refs.mono-label.tsx`, the ruled `Frame`, `home-refs.reveal.tsx` | `src/components/landing-skin/` (shared by landing, footer, cookies) |
| `home-refs.footer-scene.tsx` + the prototype footer | `src/components/footer/` (`AppFooter`, app-wide) |
| `privacy/cookies.*` | `src/features/privacy/` |
| `src/routes/index.tsx` | rewritten as a thin route over `LandingPage` |

Round one (`landing/home`, the information-architecture comparison) is deleted
with this promotion; its winner is what round two onward was built on.

## Decisions taken at promotion

These are the places where the prototype could not decide for production and a
default had to be picked. Each can be revisited; none should be reopened
without reading the reason.

1. **Footer content.** The prototype footer is a skin proposal with two short
   columns. Production keeps what the shipped footer carried that tests, copy
   or provenance depend on: the GitHub repository link, the cookie settings
   link (the cookies page copy promises it is "one click away in the footer"),
   a data-source line naming ANAF and the Ministry of Finance (DESIGN.md §Data
   Trust applies app-wide), and a feedback link. The Better Stack iframe badge
   becomes a text link to the status page, and "back to top" is dropped: both
   fought the scene. One `nav` landmark, `Navigare footer`, rather than one per
   column.
2. **"Despre proiect" link.** The band linked to a prototype URL. The about
   page is a sketch with `[Provizoriu]` copy, so no `/despre` route ships and
   the link is omitted until one does. The people band otherwise ships as
   settled.
3. **Institution count.** The prototype hard-coded `3.295 instituții cu
   execuție 2024` and told promotion to fetch it. Production fetches
   `entityAnalytics.pageInfo.totalCount` with `limit: 1` through the same
   filter the ranking page uses, and omits the figure while loading or on
   error. A stale literal is never rendered as served truth.
4. **`/cookies` redirect.** The shipped page returned to `?redirect=` after any
   decision; the prototype only offered a back button. Production keeps both:
   a safe `redirect` is followed after a decision, and the back button stays.
   `redirect` is validated on the route, not read loosely.
5. **Source language.** Prototype copy is Romanian source text. It is wrapped
   in Lingui macros as-is (the repo already does this in 136 files) and the
   English `msgstr` values are filled in `src/locales/en/messages.po`. Module
   scope constants use `msg` descriptors resolved at render so SSR never bakes
   one request's locale into the next.
6. **About prototype.** Its band variants (`duo`, `bench`, `stage`) are the
   comparison the shipped band won, so they are deleted; the page sketch stays
   under `/development/landing/about` and imports the promoted people data.

## Inline `<style>` blocks

The motion files carry their keyframes in `<style>` elements rather than
Tailwind utilities. DESIGN.md §Motion names the landing as its worked example
and the `[data-reveal]` state machine cannot be expressed as utilities without
arbitrary values that would leak literals into full-checkout CSS. Recorded here
as the exception; do not extend the pattern to static styling.

## Follow-ups

- A real `/despre` page, and the band link back once it exists.
- Review of the English copy in `en/messages.po` by a native reader.
- `tests/e2e-flows/01-landing-page.md` still describes the old page's cards.
