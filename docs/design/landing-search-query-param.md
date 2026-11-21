# Landing search from the address: `/?q=`

Status: requirements, 2026-11-21, revised after Astra's review the same day. The owner asked for
the feature and to proceed with the recommendation (design 1, "arrival only"); the rulings
below are the controller's, each with its reason.

## Intent

A link such as `https://transparenta.eu/?q=primaria%20cluj` opens the front door with the
search field already holding `primaria cluj` and its results on their way, so other sites,
newsletters, our own pages and a browser's address-bar search can send a reader straight
into a search. The site already promises this: the root's `WebSite` JSON-LD advertises a
`SearchAction` with the target `/?q={search_term_string}` (`src/routes/__root.tsx`), which
until now opened an empty field.

## Decisions

1. **Arrival only.** `q` fills the field when the page is opened. Typing afterwards does not
   write the address (no `replace` on every pause, no history entries, no clash with the
   budget map's `?harta=` writes). `q` stays in the address until the reader leaves; the map
   picker keeps it, as it keeps every other key.

2. **The value, as a link carries it.** The contract is the standard query string the
   `SearchAction` template produces: `+` and `%20` are spaces, `%2B` is `+`, diacritics are
   percent-encoded UTF-8. The app's router codec reads each value as JSON first, so a
   number-only `q` (`?q=2816464`, a CUI) arrives as a number, and `true`/`false` as booleans.
   - The route (`validateSearch`) owns `q` and returns both of its keys, `harta` and `q`
     (an unreadable value as `undefined`, which the root's passthrough search needs). It keeps
     the value **as the router read it** — a string, a boolean or a safe integer — and drops
     anything else (a repeated `q`, an array or object, a number that is not a safe integer,
     `null`). Normalising it there would make TanStack's server render redirect to the
     re-serialised address (`router-core` `beforeLoad`: a validated search that serialises
     differently is a redirect); keeping the value makes `/?q=2816464` serialise back to itself.
   - The **term** is derived from that value: `String(value)`, every run of control
     characters (CR, LF, tab, …) replaced by one space (a text field is single-line), trimmed,
     cut to `MAX_ADDRESS_QUERY_CHARS = 200` Unicode code points and trimmed again; empty means
     no term. Inner spaces and diacritics stay as written.
   - Leading zeros survive (`007` is not JSON, so it stays a string). A router-built link to
     a digit string serialises with JSON quotes (`?q=%222816464%22`) and reads back as the same
     text. **Known limit:** an external link whose whole value is wrapped in double quotes
     (`?q="primaria cluj"`) is read as a JSON string, so the field shows it without the quotes.
     The site's search has no phrase syntax, so nothing is lost but the marks.
   - The codec is moved out of `src/router.tsx` into `src/lib/router-search-codec.ts` so tests
     exercise the real one.

3. **Server-rendered, and the reader's edit wins.** The plain field (`DeferredLandingSearch`)
   starts with the term, so the served HTML already shows it, with the clear button, before
   hydration. Server and first client render read the same validated term, so hydration
   keeps the server's input node with no mismatch. Whatever the input holds when hydration
   commits — a replacement, a deletion to empty, a moved selection — is taken into the field's
   state and handed to the combobox. The hand-over (`useSearchResults({ initialTerm })`) is
   unchanged.

4. **Opt-in prop.** `DeferredLandingSearch` gains `initialTerm?: string`. Only the landing's
   hero passes it; the five hub pages that share the field are unchanged.

5. **Results.**
   - Desktop, cold (the combobox code not yet loaded): the plain field autofocuses; the
     combobox takes that focus back at hand-over and opens its list on focus, so the results
     show with no keystroke.
   - Desktop, warm (the combobox already loaded, a later visit to `/` in the same document):
     the combobox autofocuses and opens the same way.
   - With a queryable term (3+ characters), the combobox is fetched at once rather than at
     idle, so a phone reader's first tap finds the answer ready. A shorter term keeps the
     idle fetch and shows the existing "type more" hint once used.
   - Phone: nothing takes focus (the keyboard would cover the page); the field shows the term
     and the list opens on the first tap.
   - Loading, empty, incomplete and error states are the existing ones.

6. **Focus and caret.** The page's autofocus (both paths) takes only focus nobody has claimed:
   a reader who reached the field, its clear button or anything else before the page hydrated
   keeps it. When the autofocus lands on an untouched prefill, the caret goes to the end of
   the term. A selection or caret the reader set is kept.
   - A composition (an IME, a dead key) holds the hand-over, as today. One begun before
     hydration is seen from its next input (`isComposing`). **Residual:** if the combobox
     arrives between that composition's start and its next keystroke, the field is replaced
     mid-composition. The window predates this feature (the idle fetch had it too); the eager
     fetch makes it earlier, not new.

7. **Navigation.** The field is keyed on the address term:
   - `A → B → Back → Forward` shows `A, B, A, B`; removing `q` shows an empty field. A new term
     starts the field afresh (chips and draft go, as with any new search).
   - A `harta` change, or any navigation with the same term, keeps the field — draft, chips
     and focus.
   - Choosing a result clears the field, as it always has. Back after the next page has
     appeared shows the address term again (a new field). Back pressed while that page is
     still loading returns to the landing that never left, so its field stays as the
     reader's choice left it — empty. Found in the browser check; kept, since the field is
     the same one the reader just used.

8. **Escape and clear.** As today, the seed changes nothing: in the plain field the first
   Escape clears; in the combobox the first Escape closes an open list and the next clears
   text and chips; the clear button empties the field. The address keeps its `q`, a map change
   keeps the cleared field, and a fresh load seeds it again.

9. **Telemetry carries no reader's search text — from any page.** Every `q` parameter's value
   is masked (`q=_`) in every telemetry string — PostHog's `$current_url`, `$referrer`,
   `$initial_current_url`, `$initial_referrer` and any other property, the pageview the app
   captures itself, the PostHog request guard, and Sentry events, breadcrumbs, error contexts,
   request query strings and envelopes — including inside a return address nested in another
   (the cookie settings' `redirect`), escaped whole, in part or not at all. Scrubber:
   `src/lib/privacy/search-terms.ts`.
   - **Why every page, not just the root.** Two Astra reviews found leaks in each attempt to
     tell which page a `q` belongs to (`?%71=`, a repeated `q`, `//host/?q=`, `&amp;`, a
     partly escaped `redirect=/?harta=…%26q=…`, `/catalog/../?q=`, a backtick or `&quot;`
     splitting a value). The other pages' `q` (the parliament and classification searches) is
     reader-typed text too. **Cost:** those searches' terms no longer reach PostHog's URLs.
     Over-scrubbing telemetry is the safe direction (TEL-001); an existing TEL-001 test that
     kept `/search?q=…` as it was now expects it masked.
   - **How.** One pass, nothing decoded: a parameter starts after `?`, `&`, `&amp;` or their
     escapes (`%3F`, `%26`, escaped any number of times — the footer's cookie link wraps the
     current address again on each visit); its name is `q` or its escape (`%71`); `=` may
     be escaped (`%3D`). Its value runs to the next parameter (an `&`, `&amp;` or `%26`
     followed by a name and its `=`), a fragment (`#`), whitespace, or a `"`, `<` or `>` (which no address leaves unescaped, and which
     close the JSON string or HTML attribute it sits in). What an address does leave
     unescaped — `'`, `(`, `)` (the router writes parentheses as they are), `!`, `*`, `~`, the
     backtick — is part of the value, as are an escaped space, `&`, `#` or line break (a
     search can hold one; an escaped list of addresses is masked from its first `q` on, the
     safe direction) and HTML entities (`&#x27;`, `&quot;`). Linear time.
   - Values held by a `q` key, whatever their shape (a query string parsed into
     `{ q: ['Cluj', 'Napoca'] }`), query-string pairs `['q', …]` (Sentry's `query_string`), and
     the keyword PostHog copies out of an external search engine's referrer (every key ending
     in `ph_keyword`: `ph_keyword`, `$initial_ph_keyword`, `$session_entry_ph_keyword`) are
     masked too. PostHog stores the campaign parameters it copies out of the address
     (`utm_*`, `gad_source`, `mc_cid`, click ids — its `CAMPAIGN_PARAMS`, with its `$initial_`
     and `$session_entry_` prefixes) decoded, so one that holds a `q` at all is masked whole.
     The `&amp;` separator is read URL-escaped too (`%26amp%3B`).
   - It runs **first** in the shared chain and the pageview, before the scrubbers that decode
     whole strings (the procurement one decoded `q=River%20Town` and left `Town` behind).
   - **Residuals:** a search text that itself contains `&name=` reads as two parameters, and
     the part after it stays; an address written with a literal space (hand-written text, never
     a browser or router URL) ends its value at the space.
   - **Out of scope, pre-existing:** another site's own search parameter in an external
     referrer (Yahoo's `p` in `$referrer`, `$initial_referrer`, Sentry's `Referer`) is the
     reader's search on that engine, sent before they reach this site and unrelated to `/?q=`.
     It predates this feature; whether to mask external referrers is the owner's call
     (TEL-001 follow-up). The engines whose parameter is `q` (Bing, DuckDuckGo) are masked by
     the rule above.
   The search event itself is unchanged (lengths and counts only). With an eager fetch, a
   phone arrival whose answer comes back counts as a performed search before any tap — the
   term was the reader's own request.

10. **Caching.** Nitro's route cache cannot be bypassed per query (its cached handler allows
    only a method check), and the landing's served HTML already echoes the whole search in the
    router's dehydrated state. A cached `/?q=A` page is served only to someone asking for that
    exact address, who already holds the term. Ruling: keep `/` publicly cacheable, `q` pages
    included; verify on a production build that `/`, `/?q=A`, `/?q=B` alternated with the same
    cookie each return their own field. Unbounded cache keys from arbitrary query strings are a
    pre-existing property of every cached route, not new here.

11. **Search engines.** The canonical and `og:url` stay at the site root. A `q` page also
    says `noindex,follow`, so a search link is never a result of its own.

12. **Hostile input.** The term reaches the page only as a React input value and the API only
    as a GraphQL variable. A term with `<`, `&` and quotes shows literally and adds no element.

## Non-goals

- Writing the address as the reader types (design 2), or Back restoring an edited query.
- `q` on the hub pages, and filter chips from the address (`?q=` is text only).
- An OpenSearch description for the browser's address bar (a possible follow-up).

## Tests

- Codec (real `parseAppSearch`/`stringifyAppSearch`): `Iași+Nord` and `Iași%20Nord` read as
  `Iași Nord`, `C%2B%2B` as `C++`, `2816464` as a number that serialises back to itself,
  `007` as a string; validated values serialise back to the address they came from.
- Term derivation: trim, control characters, empty, booleans, safe integers, the 200
  code-point cap with an emoji at the boundary.
- Route: `validateSearch` returns both keys and drops unreadable `q`; the head adds
  `noindex,follow` only with a term.
- `DeferredLandingSearch` with `initialTerm`: server HTML holds the term and the clear button;
  hydration keeps the node with no error, and a pre-hydration replacement, deletion and
  selection win; a queryable term fetches the combobox at once, a short one does not; desktop
  cold and warm paths open the results with the caret at the end; without the prop nothing
  changes; markup-like text stays literal.
- Landing page: a changed address term starts the field afresh; a `harta` change keeps it.
- Telemetry: the scrubber on relative, absolute and protocol-relative addresses, escaped names,
  repeated keys, nested return addresses escaped whole, in part or not at all, quotes and
  `&quot;`, prose, hostile strings in linear time; the shared chain, `sanitizePostHogEvent`,
  the pageview, the PostHog request guard and the Sentry transport.
- Browser, on the dev server and a production build: desktop shows results for `?q=primaria`,
  phone width shows the term and opens results on tap, `?q=2816464`, `?q=` with `harta`, a
  diacritic term with `+` spaces, Back/Forward between two terms, and the cache check above.
