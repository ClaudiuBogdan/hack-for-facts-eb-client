# Companies hub (`/companies`) — design record

> **Superseded in part on 23 September 2026** — see
> [§ The hub reads the economy, not the register](#the-hub-reads-the-economy-not-the-register-2026-09-23)
> at the end. The composition below stands; its figures, bands and data
> source changed.
>
> **And again on 4 October 2026** for the figures: the snapshot's business
> figures are retired and every hub figure is the pinned ONRC edition's — see
> [§ The hub and the profile read the pinned ONRC edition](#the-hub-and-the-profile-read-the-pinned-onrc-edition-2026-10-04).
> The 23 September record stays below as history.

**Status:** promoted, 17 September 2026. The `editorial` variant is live at
`/companies`; the prototypes under `/development/companies/hub` are deleted
with the promotion, losers included, per
[`prototyping.md`](../prototyping.md).

## Where the code went

> As promoted on 17 September. Since the 23 September rewrite, `hub-sections.tsx`,
> `county-map.tsx` and `use-company-county-counts.ts` are gone. Since 4 October
> the 23 September views (`hub-leaders`, `hub-sectors`, `hub-county-band`,
> `company-county-map`, `company-county-rank`, `lib/hub-view.ts`) are gone too:
> the hub is `private-company-hub-page.tsx` over `company-hub-bands.tsx` and
> `hooks/use-company-hub-stats.ts`. `lib/hub-snapshot.ts` stays only because
> procurement reads its population.

| Prototype | Promoted to |
|---|---|
| `hub.editorial.tsx` | `src/features/private-companies/components/hub/private-company-hub-page.tsx` |
| `hub.parts.tsx` | `.../components/hub/hub-sections.tsx` |
| `hub.map.tsx` | `.../components/hub/county-map.tsx` |
| the CAEN table in `hub.data.ts` | `.../lib/caen-divisions.ts` |
| `foldCountyName` | `.../lib/county-names.ts` |
| the status codes | `.../lib/company-status-codes.ts` |
| `useCountyCounts` | `.../hooks/use-company-county-counts.ts` over `fetchCompanyCountyCounts` in the feature's `api/` |

The old hub page and its `company-hub-blocks.tsx` are deleted. The route is
unchanged: `companies.index.tsx` keeps the `?q=` redirect into the directory,
and `companies.index.lazy.tsx` keeps pointing at `PrivateCompanyHubPage`.

## Decisions taken at promotion

These are the places where the prototype could not decide for production.

1. **The search changed behaviour.** The old dock committed Enter to
   `/companies/search?q=…`; the promoted field is the landing's search pinned
   to `docTypes: ['company']`, so Enter opens the first matching company's
   profile and there is no "search the directory for this text" path from the
   hub. The directory stays one click away through the active-companies
   shortcut, the four tiles, the sector bars, the county map and list, and the
   three investigation cards. Revisit if readers ask for the old path back.
2. **No mock badges ship.** The prototype's invented ONRC capture and ANAF
   snapshot dates are gone rather than badged: an operational date that can
   drift silently is worse than none. The sources strip shows the served
   `computedAt` and says the per-source dates are not published by the API.
   The CAEN division names stay, because they are the real Rev.2 nomenclature
   rather than fabricated data, with the caveat beside the bars.
3. **The counties keep their own query.** `companyHubStats.topCounties` is
   trimmed to ten and a map drawn from ten counties would render the other
   thirty-two as no-data. `fetchCompanyCountyCounts` asks
   `companyCountyProfile` for all of them, measured at 2.7 s and held for an
   hour. Kept separate from the cached aggregate on purpose, so the four
   figures never wait for the map and one failing leaves the other standing.
4. **Numbers are pinned to Romanian separators.** The feature's
   `formatInteger` is `ro-RO` for every surface, so the count-up and the
   percentages are pinned too. Following the UI language for some of them
   would print `3,892,657` above `341.116` on an English page.
5. **Romanian source strings**, as the landing did, with English filled into
   `en` and the source pinned into `ro`. An empty `ro` msgstr compiles to the
   source locale, which becomes English the moment `en` is filled.

## Follow-ups

> Retired on 23 September: the hub no longer reads `companyHubStats` or the
> county profile, and names divisions itself. The current follow-ups are at the
> end of this document.

- Extend `companyHubStats` with all counties and their labels, and retire the
  second request.
- Group `caenDivisions` by division *and* revision on the server, and serve the
  labels, so the nomenclature table here can go.
- Publish the ONRC capture and ANAF snapshot dates on the hub payload.

The hub is the front door, not the analytics page. A dedicated companies
analytics surface may follow (the scrapper's
`PRIVATE_COMPANIES_ANALYTICS_SPEC.md` is its contract). The hub must load
fast, look like the new landing (`src/components/landing-skin/*`), and show the
few things a reader can act on: find a company, explore a sector, explore a
place.

## What the API serves today (16 September 2026, Chronos prod)

| Field | Serves | Cost |
|---|---|---|
| `companyHubStats` | totals (3,892,657 on the CUI spine; 1,749,479 in ONRC status 1048), full `statusMix`, top-10 counties among active, every CAEN division among active (two-character keys, `label: null`), coverage (39% of active companies carry no county), `computedAt` | 6 h server cache, ~30 s cold; stale-while-revalidate once warm |
| `companies(filter, q, …)` | directory rows; `totalCount` bounded at 10,000 (`totalEstimated`) | per request |
| `companyCountyProfile` | grouped counts; `groupBy: COUNTY` needs a selective filter | slow scans, not for a hub |
| `company(cui)` | full profile incl. financials FY2008–2025 and public money received | per company |
| `referenceClassificationCodes` | CAEN labels by system/code | cheap, cacheable |
| entity search (`docTypes`) | the landing search already accepts a `docTypes` list | per keystroke |

Confirmed on the server: the hub use case computes **all** county groups and
slices to ten (`TOP_COUNTIES_CAP`), so a full-county map is a response
extension, not a new scan.

## Candidate features, ranked

Value and effort on 1–5. "Repos" says which checkouts change.

| # | Feature | Why a reader cares | Data | Repos | Value / effort |
|---|---|---|---|---|---|
| 1 | **Company search**, the landing search locked to the `company` scope, with a link to the full directory | The fastest path from a name or CUI to evidence | existing entity search, send `docTypes: ['company']` server-side instead of the landing's client-side chip | client | 5 / 2 |
| 2 | **Data snapshot band**: companies in the dataset, in ONRC "funcțiune", share with a known county, as-of dates | Sets the scale and says what can be investigated | `companyHubStats` | client | 5 / 1 |
| 3 | **CAEN sector chart**: labelled horizontal bars for the top divisions, expandable, each bar a filtered directory link | Turns 1.7M anonymous companies into recognisable sectors | `caenDivisions` + reference labels; server should group by (division, revision) and attach labels itself | client, server | 5 / 3 |
| 4 | **County map + ranked list**: light SVG choropleth from the county GeoJSON, no map SDK; list first on mobile | Makes the dataset locally relevant at a glance | `companyHubStats.counties` (return all 42 units instead of the top 10) | client, server | 5 / 3 |
| 5 | **Coverage and sources strip**: population, county gap, ONRC/ANAF as-of, financial years, quality assessment span | Lets a reader judge whether an absence means anything | coverage + `computedAt`; server should add source as-of dates to the hub payload | client, server | 5 / 2 |
| 6 | **Investigation shortcuts**: insolvency and bankruptcy, ONRC-active but declared fiscally inactive, a sector of choice | Gives non-experts a first question | `companies` filters, plain links, no count badges | client | 4 / 1 |
| 7 | **Lifecycle composition**: one stacked strip of statuses with exact counts, behind progressive disclosure | Explains why the corpus is twice the active population | `statusMix` | client | 4 / 1 |
| 8 | **Financial coverage by year**: how many companies have statements per fiscal year and source | Shows which years support a story | new cached aggregate over `companies_v2.financials` | server (maybe scrapper projection) | 4 / 3 |
| 9 | **Public money preview**: companies receiving public money in one named year, totals by flow type | The most direct link to the platform's mission | new cross-domain aggregate over the kernel flows | server + scrapper | 5 / 4 |
| 10 | **Registration-year histogram** with an explicit unknown-date bucket (256,142 null dates) | Cohort entry points | new aggregate; `registration_date` is unindexed | server | 3 / 2 |
| 11 | **Financial leaders** by turnover or employees for a named year | Strong local leads | new ranking with quality flags | server + scrapper | 4 / 4 |
| 12 | **Registry-change digest** between the two ONRC captures | Monitoring subjects | corpus summary of the per-company diff | server | 3 / 4 |

## Recommended cut

Ship 1–5 as four modules, fold 6 and 7 into them, defer 8–12 to the analytics
page. If one later addition is allowed, it is 9.

Composition to prototype:

1. Title, one sentence on the dataset, the scoped search, "Explorează toate
   firmele" beside it.
2. One ruled metrics band (dataset size, in funcțiune, county coverage with the
   missing share stated).
3. CAEN chart as the page's chart, then the county module (map beside list on
   desktop, list first on mobile), both navigating to `/companies/search`.
4. Investigation links, then the coverage and sources strip.

Speed: everything but the numbers is SSR-able. The hub cache makes a cold
caller wait about 30 s, so the page shell must never await it; either fetch
client-side with reserved dimensions (today's landing pattern) or persist and
prewarm the last aggregate and SSR it behind the public cache header.

## The comparison that settled it (16 September 2026)

Three compositions over the same modules were built at
`/development/companies/hub` and compared; **`editorial` was chosen for its
layout** and is what shipped. The prototypes are deleted.

| Variant | Shape | Outcome |
|---|---|---|
| `editorial` | The landing's rhythm: hero with search and the status panel, figures band, then one numbered band each for sectors, counties (map beside list, shared highlight), investigations, sources. | **Chosen.** One idea per band reads top to bottom; nothing competes for the fold. |
| `atlas` | The map is the hero, beside the search and the top-5 counties; figures band; sectors with status and investigations in the side column. | Rejected, deleted. The map above the fold made the page about places before the reader had said what they wanted; the search lost its primacy. |
| `compact` | Short header, search, figures as a strip, then hairline tiles: sectors, counties with a small map, status, investigations. | Rejected, deleted. Least scrolling, but the tiles read as a dashboard, not a front door, and the small map lost its labels. |

Polish applied to the chosen variant after the decision: a two-line headline
with no widow; the status panel with one row per state (count, share, a saved
query each); the figures count up on arrival as the landing's do; the county
map and list share a hover highlight; codes with no CAEN division behind them
are stated below the bars rather than ranked among the sectors.

Live in all three: `companyHubStats`, the all-county profile (a 2.7 s request
the promoted hub should not make; the server already computes it), and the
entity search scoped server-side to `docTypes: ['company']`. Stand-ins, badged
where drawn: CAEN division names (the reference module serves four-character
classes only) and the corpus-wide source dates.

Production change made for the prototypes and kept: `useSearchResults` takes
`docTypes` (in the query key) and `suggestions`; `LandingSearch` takes
`docTypes` and a `fixedScope` pill. Tested in `use-landing-search.test.tsx`.

Data-trust corrections carried by the prototypes, against the current hub:
the county gap is computed (active minus placed, 593 on 16 September 2026),
not read from `territoryUnmatched`, which is the SIRUTA placement gap; the
"CAEN 41 has the most public contracts" claim is gone; the CAEN sentence says
that a company can sit in several bars.

## Server work that unlocks the cut

- `companyHubStats.counties`: all county units with stable keys, names, counts,
  plus the missing-county bucket separately. Same cache, same computation.
- `companyHubStats.caenDivisions` labelled by the server, grouped by division
  and revision; state the activity basis (recorded activities, multi-membership).
- Source as-of dates (ONRC capture, ANAF) on the hub payload.
- Optional: `companyFinancialCoverageByYear`, daily cache.

## Traps

- A national map drawn from ten counties: unreturned counties are not zero.
- `territoryUnmatched` is the SIRUTA match gap, not "no county"; say which.
- CAEN counts overlap across divisions; no pies, no additive totals, no
  "market share". A null label shows the code, never guessed text.
- A capped directory count renders as "10,000+".
- "Companies in our dataset", never "all Romanian companies"; `computedAt` is
  not the source date; ONRC funcțiune is not fiscal activity.
- Drop the current claim that CAEN 41 has the most public contracts; nothing
  served supports it.

## The hub reads the economy, not the register (2026-09-23)

The hub, like the INS hub before its rewrite (statistics §6n), spent its best
space on the database: „3.892.657 firme în setul de date", ONRC status codes
in every note, a register-status panel in the hero, a caveat about the CAEN
nomenclature, a sources strip and an „Agregat calculat la" date. None of it
answers a question a reader brings about Romanian companies. It now says what
the economy looks like, in the INS hub's composition and components.

- **Hero:** search (unchanged), and beside it the **ten largest companies of
  2025**, by turnover or by employees (`?clasament=`), each with its change on
  2024, a „radiată" note when it has left business since (Profi, #9), and a
  link to its profile. Five rows on a phone.
- **Figures band:** companies in business (July 2026 capture), companies
  founded in 2025, turnover and average employees from the 2025 statements
  („Din 902.043 de bilanțuri pe 2025"). Turnover and employees open band 01
  ranked by that measure.
- **01 / Pe domenii:** the CAEN divisions by turnover, employees or companies
  in business (`?domenii=`), each with its share of the total — by the main
  activity declared to ANAF, so a company counts once and the shares add up,
  with the companies that have no recognised main activity as the last row of
  the full list. One quiet line says what a row counts and what its link
  opens (every company with the activity, not only the main one), and that
  banks and insurers file elsewhere. Beside it, the size classes of the
  statements with a headcount (84 report none and have no class): the 1641
  companies with 250+ employees make 40.7% of all the turnover reported. The
  lede is computed from the snapshot.
- **02 / Pe județe:** the INS county map and ranking, over companies per 1,000
  residents (population named in the legend), companies founded in 2025, or
  reported turnover by registered office (`?indicator=`). Same readout,
  legend, colour steps, touch model and national reference as `/ins`. A
  county opens its companies in business whatever the layer: the map is a way
  into a place, and the readout's link says so („Firmele județului").
- **03 / Din 1991 până azi:** companies founded each year against those in
  business in July 2026, on the INS two-line chart; the lede is the 2015
  cohort's survival (50.9%), and beside it the sectors of 2025's new
  companies (one in seven is road transport). Those rows are not links: the
  directory can select neither a compact-code registration year nor a main
  activity, so any query would list a different population than a row counts.
- **04 / Analize:** the insolvency procedure in all its statuses (21,420),
  in business but fiscally inactive at ANAF (300,438), dissolution in all its
  forms or liquidation (82,029) — each count exactly the directory query its
  card opens (`INSOLVENCY_STATUSES`, `DISSOLUTION_STATUSES`).
- **Removed:** the status panel, the „în setul de date" total, the CAEN
  caveat, the county gap note, the sources strip, `computedAt`, and with them
  the `companyHubStats` and all-county `companyCountyProfile` reads, their
  hooks, mappers, mocks and fixtures.

**The figures are a snapshot kept in the client**
(`lib/hub-snapshot.ts`), generated by
`scripts/generate-companies-hub-snapshot.mjs` from the production database
(read-only role, one `REPEATABLE READ` transaction) and INS POP105A through
the API; it refuses to write a read whose parts do not add up to their
totals. A closed year of statements and registrations does not change, and
the live aggregate cost a 30-second cold scan. The page now server-renders in
full and asks the API for nothing but the search; the route's loader imports
the snapshot, so it is not in every route's entry chunk. It is publicly
cached with `Vary: Cookie` (the locale and theme cookies change the HTML),
and each language has its own canonical (`?lang=en` for English) with
hreflang alternates. Measured on a production build: TTFB 63 ms, LCP 348 ms
(the headline), CLS 0. Refresh once a year, when the next year's statements
are in (ANAF publishes them from June), with `--year`, and read the diff
before committing it; the registry period comes from the latest ONRC capture.

What the numbers are, and the decisions behind them (measured 23 September
2026):

- **FY2025 is 93% of FY2024 by statement count** (902,043 of 965,213): ANAF
  was read mid filing season and re-read only prior filers. The rankings are
  unaffected — the largest missing filers are banks and insurers (they file
  with the BNR and ASF) and industrials below the top-10 thresholds
  (turnover 14.2 bn lei, employees 10,171) — but the totals are a lower
  bound, so the page names them by what they sum and the shares as shares of
  what was reported.
- **One employee count above 50,000 is dropped** from every employee figure
  (122,690 employees, no turnover); the largest real employer, CFR, reports
  23,666.
- **ANAF's main activity codes mix CAEN revisions** with no revision on the
  field: 890,607 companies carry a code that is not a Rev.2 class — Rev.3
  since 2025 on active firms (4933: 40k, 9531: 13.5k), Rev.1 on dormant ones.
  The snapshot keeps a Rev.2 class's division and a Rev.3 class's division
  (they line up), moves Rev.3 vehicle repair (95.3x) back to 45, and counts
  anything else (43,256 active firms) as no recognised activity. Rev.3
  vehicle trade stays in 46/47, where Rev.3 puts it.
- **Founded in 2025 = 153,618**, from the registration date or, for the
  compact codes ONRC issues since September 2024 (which carry no date), the
  year in the code. 153,614 of them have CUIs issued since 2024, so county
  transfers do not inflate the count.
- **Counties follow the registered office**: turnover by county is where head
  offices are (București 38%), which the legend says. Money never goes past
  billions („1.081,3 mld.", not „1,1 tril."), so a column reads by its digits.
- **No public-money ranking**: the 2025 top payees include single
  framework-sized flows (a music SRL at 504 M lei) that would read as fact.
- **No profit ranking**: holdings booking subsidiaries' dividends lead it.
- **Numbers follow the page language**, as on `/ins` (reversing decision 4
  above for the hub; the directory and the profile stay pinned to `ro-RO`).
  Counts inside sentences go through `plural`, since Romanian writes „de"
  before 20–99 and not before 01–19. Sector names are `msg` descriptors with
  English translations; the hub's generic words carry a message context so
  their English does not leak into other features.

Follow-ups:

- The county map duplicates the INS map's interaction code; extract one
  shared choropleth (and the hub chrome it borrows from `statistics`) once the
  INS map's pending selection mode lands.
- The directory filters CAEN by any recorded activity; a main-activity filter
  (`mainCaenCode` takes exact classes only, without an index) would let a
  sector row open exactly the companies it counts.
- The directory's registration filter cannot see compact-code registrations;
  a `registrationYear` filter over the year hint would let „Firme noi" link.
- The scrapper should record the CAEN revision of ANAF's main activity code,
  so the division mapping above can go.

## The company profile (`/companies/$cui`), promoted 24 September 2026

The tabbed profile (summary, activity, procurement, governance, financials,
location, litigation) is replaced by one scroll in the hub's language. Three
layouts were prototyped at `/development/companies/company-page` over five
real companies frozen from the dev API (OMV Petrom, ABC-CON in insolvency,
Profi struck off, 66 Jack with a decade of losses, A & B Ideatica with no
statement):

- **`benzi`, editorial bands — kept.** A compact head (back link by county and
  sector, name, one computed sentence, status and identifiers) beside one chart
  of the last five years with a statement; the figures band; one numbered band
  per question with a pinned bar of section links.
- `fisa`, a company sheet with a sticky identity rail beside every section in
  full, and `intrebari`, questions answered in a sentence over four tabs of
  detail — both dropped when the owner chose the bands and asked for one
  editorial layout in the hubs' language (commit `f2e88268`).

The owner's steer while choosing: keep the head about the company (no rank
sentence, nothing hand-written for one company), one combined chart with the
legend in the band labels and the values on a tooltip instead of a table or
tabs, the figures band kept, and the company's share of its sector, county and
country moved to its own band near the end, only when a share reaches 1%.

### Where the code went

| Prototype | Promoted to |
|---|---|
| `company-page.data.ts` | `lib/company-profile-model.ts` (profile only) + `lib/company-procurement-read.ts` (SEAP) |
| sentences in `company-page.parts.tsx` | `lib/company-profile-text.ts` |
| `company-page.format.ts` | `lib/company-profile-format.ts` |
| `company-page.charts.tsx` | `components/profile/company-year-charts.tsx` |
| `company-page.bands.tsx` + parts | `components/profile/company-profile-page.tsx` and one file per band (`company-profile-head`, `-business-`, `-money-`, `-activities-`, `-economy-` (removed 4 October 2026), `-litigation-`, `-registry-band`) |
| `company-page.state.ts` | the route's search schema (`masura`, `plati`, `litPage` in `schemas/private-company.ts`) |
| `company-page.fixtures.ts` | builders in `lib/company-profile.fixture.ts`; raw GraphQL for the integration spec in `tests/fixtures/companies-profile-flow/` |

The old page's components (`layout/`, `sections/`, `charts/`, the tab files,
`company-page.css`) and the helpers only they used (`tab-config`,
`financial-chart-data`, `profile-display`, `company-status-display`) are
deleted. The figures band is the hubs' `HubFiguresBand`, which now spreads
fewer than four figures over the width and leaves out an empty note.

### Decisions taken at promotion

1. **The profile renders on the server in full; SEAP names arrive after.**
   Everything drawn from the profile — head, chart, figures, money totals and
   per-year chart, activities, economy, registry — is in the server HTML. Who
   paid, for what, and the newest records come from the procurement supplier
   slice (five reads, 0.3–0.8 s against the dev API), fetched in the browser
   with a pending and a failed state of its own; the loader starts it beside
   the profile on a client navigation, through a dynamic import so the
   procurement code stays out of the entry chunk. The page waits for it only
   when the profile has SEAP flows.
2. **A record's amount is the accepted comparable value** (`describeMoney`),
   never its raw `valueRon`: a framework agreement or an invalid source value
   shows „—". The prototype showed the raw value.
3. **The payers' bars follow what SEAP could rank by.** When too little money
   is published to rank by it, the list is by number of records, the bars
   follow the count, and a line says so.
4. **Litigation is a band only when the justice read answers.** The live
   litigation API is not connected, so outside mock mode the band never shows;
   it will when the API lands, paged by `?litPage=`. The justice case page's
   „back to the company" link now opens `#litigii`.
5. **Old links still open the page.** `?tab=` and unknown values are dropped by
   the search schema rather than failing the route; `?masura=` and `?plati=`
   keep only values the page knows, and a default never enters the URL.
6. **Numbers follow the page language** (the hub's formatters), unlike the old
   profile's `ro-RO` pinning. Strings are Romanian source with English in `en`
   and the source pinned in `ro`.
7. **Public money is „contracts and payments", never a sum „received" or
   „paid".** The profile's flows mix awarded values (SEAP contracts and direct
   purchases) with payments (PNRR, budget execution); the prototype summed
   them as „încasări" and wrote that institutions „paid" the company. The
   figure is now „Contracte și plăți publice", the lede sums the *published
   values* of the records and says that for SEAP the value is the one awarded,
   not what was paid, and SEAP's populations are „records", not „payments"; a
   negative amount (a reversal) stays in the sums. The band keeps its title
   „Ce a primit de la stat" — a company receives contracts too — and „Cine
   plătește" names the buyers, who pay under them.
8. **Only the calendar year in progress is a part-year.** The prototype took
   the SEAP slice's `window.to` for where the source stops, but it is the month
   of the company's own newest record, so a company that last won a contract
   in March 2019 read „2019 e un an incomplet". The model now marks the newest
   money year only when it is the current calendar year, from the profile —
   so it is in the server HTML — and the slice's months are worded as the
   company's records, never as SEAP's coverage.

Follow-ups:

- The route head's description is still the old English sentence; a computed
  one (the head's sentence) needs the profile model in the head.
- The profile is not publicly cached; the hub's `Vary: Cookie` cache would fit
  once the SEAP read is the only per-visit request.
- Street addresses: the API serves an empty `address.display` for every
  company, so the registry band shows the locality.

## The hub and the profile read the pinned ONRC edition (2026-10-04)

The client contract is the record; in short:

- **Hub.** Every figure is `companyHubStats` of ONE published edition, read in
  the browser under the page's pinned scope and named under the figures; the
  server HTML carries no registry figure. The snapshot's turnover, employees,
  largest companies, new companies, survival, size classes and county layers
  are retired until an edition-bound source exists. A registry that cannot
  answer is a state, never a zero.
- **Pin.** A page pins only its own successful `companyRegistry` read. A read
  that meets another scope or a refusal hides the registry facts at once until
  a later read answers; a different scope switches only when the reader asks.
- **Profile.** Shown only under the pin when its own answer matches it; only
  the server's answer for the document being hydrated stands in before the
  first registry read. A comparison read that finds no directory company
  withdraws the profile and reads it again, never as „not registered".
- **Evidence.** The edition's original rows are listed with every value an
  identity row carries, whether or not an identifier group was resolved.

## The analysis filters panel's lists (3 October 2026)

The owner, looking at the „Filtre" panel of `/companies/analytics`: no two
columns of options past four, one column; a long list gets a search and
scrolls. Then, picking a size band: the list jumped under the pointer. The
rules the panel keeps since (`analytics-filter-fields.tsx`):

- **Up to four short values side by side** („Da / Nu / Necunoscut", „Toate /
  Au depus / N-au depus"), each as wide as its word, so none is cut or wraps.
  **Past four, one column** of rows with their boxes. **Past eight, a search**
  over names and codes above it, and the list scrolls (about six rows):
  legal forms (12) and ONRC statuses (43 and the unknown group). Size bands
  (7) and the CAEN revision (3) are one column without a search.
- **A legal form by its code and its name** („SRL Societate cu răspundere
  limitată"); the six codes that had no name got one (SC, SCE, SE, GIE,
  GEIE, INCD), which the profile's head and its page title use too. The
  registry's statuses start with a capital in a list, and stay in lower case
  in a sentence.
- **Nothing above a list changes when it is picked from.** What was picked
  when the panel opened comes first; a pick made now stays where it was
  clicked. The note that value and size filters keep only the filers sits
  under the size list, not under „Situație" above it, and only while
  „Toate" is chosen. The page's first question pins the release it was
  answered from (`editie`); that pin is answered from the release already
  read, so the page and the panel never empty while the same answer is read
  again (the panel's statement fields used to remount with the pick on top).
- **Escape clears a list's search before it closes the panel.**
- **The panel is 448 px wide on a wide screen** (procurement's is 384): the
  registry's status names run to 97 characters.
- **Not a list: the main activity.** The API counts 1,290 CAEN codes, gives
  at most 100 a read and no names for codes of an unpublished revision, so a
  list would be incomplete; it stays a typed code until the server serves the
  catalogue.

The headline's filter phrases are inline text with a button's role
(`HeadlinePhrase`, shared with procurement's analytics and the NGO
registry): a `<button>` is laid out as an inline block, so a phrase that
wrapped took the line's whole width and pushed „, în 2024" onto a line of
its own.

Reviewed by Opus 5.5 (xhigh) and Codex `gpt-6.1-sol` (xhigh). Fixed from them:
the release is handed to its pin once (a pinned answer collected since is
read from the API, as a server seed is); the filers note keeps its room when
it says nothing (unticking at the panel's end shortened it, and the panel
scrolled back); a pick changes no weight (a bolder value moved its
neighbours, a bolder status name could take another line); the long lists
have their search before their values arrive; „Necunoscută" stays when the
statuses cannot be read; the three short values wrap on a 320 px phone. The
headline phrase's ✕ has an anchor of its own at the phrase's end (against a
wrapped phrase it landed on the phrase's first line), and Space opens the
panel on its release, as a button's does (on the press, the panel's close
button took the release and shut it). The new names of groups and institutes
are not feminine: the profile's sentence says „Grup de interes economic din
…, înregistrat în …".

## The analysis prototype's anatomy (12 October 2026)

The owner, comparing `/companies/analytics` with the prototype at
`/development/companies/analytics`: keep `propozitie`, fold `stare` into it,
then three rounds on the same day. Where it stands:

- **The head is the question.** The selection as the headline („Firmele SRL
  în funcțiune din Cluj, în 2024"); a state that is one of the reader's
  groups (în funcțiune, cu activitatea întreruptă, în insolvență, în
  dizolvare sau lichidare, radiate, cu starea neclară în registru) joins the
  subject, any other set of statuses follows as „cu starea „…"". Under it one
  row: **the fiscal year and the measure as dropdowns** — every measure the
  release offers, grouped as flows of the year, the headcount, the balance
  sheet at the year's end — then add a filter, the filters, the ready
  questions, the link, the notes. The state is a filter, in the panel; a
  state dropdown with counts beside the year was tried and dropped.
- **The pinned bar says how the answer is shown: Tabel · Hartă · Grafice**
  (the prototype's own `mod` key; the page's URL model does not know it yet).
- **The tabs stay on the table** and say what is shown: the companies, each
  open axis (Județe, Localități, Activitate, Mărime, Formă juridică, Stare,
  TVA, Inactive fiscal), the years. The same tabs serve the charts. A views
  bar in their place (Firmele · Defalcare · Hartă · În timp, the axis in a
  dropdown) was tried and dropped: the owner wants the axes one click away.
- **Tabel:** the companies' table, each axis ranked (sizes smallest first),
  the years as a table (a year opens the page on it).
- **Grafice:** the largest 15 companies as bars; each axis as two shares per
  group — of the companies with a statement and of the measure — so a group
  whose weight differs from its number shows it („1–9 salariați": 53 % of the
  filers, 17 % of the turnover); a measure with losses in a group is drawn
  either side of zero instead; the years' bars.
- **Hartă:** the measure by county on the hub's map; once the selection is in
  one county, by locality on that county's outline. A county narrows the
  selection (and shows its localities), a locality opens its companies. The
  companies the edition gives no single place, and the localities folded into
  „altele" past the API's 100 groups, are said under the legend, never drawn
  as zero.
- **The companies' table** (shared with the live page): one-line column
  names („Salariați"), the scale quieter than the digits, a headcount bare;
  a held or missing value is a dash with a numbered mark, the marks explained
  once under the table (it used to print „reținut: formular neverificat" in
  the cell); a company without a statement says „fără bilanț" once; places in
  title case without their kind („Mioveni, Argeș"); a state other than „în
  funcțiune" in amber.

The head, polished after the NGO registry's the same day:

- **The NGO head's chrome**: the way back and the data's date at the top
  („Date actualizate pe 11 octombrie 2026", the release's publication; the
  ONRC edition's date on hover), the quiet controls (text-sm, the filters'
  count in the accent's square, an „i" or an amber count for the notes), the
  blue crux on the head's bottom rule, the selection on the pinned bar's
  left with the modes at its right.
- **„+ Adaugă un filtru" is a search box**, as the registry's: a county, a
  locality, a legal form, a state, a size, a fiscal flag, the filing, a
  company by name (the name search) or a CUI — each answer the selection with
  that filter added; words match at their start. The panel stays „Filtre".
- **The head keeps its height** whatever the headline's length: the headline
  has a room of two 48 px lines on a wide frame (three 32 px lines on a
  phone), stands at its foot, and steps its type down by the sentence's
  length to fit; the steps are shares of the frame's width (`cqi`, capped),
  so a line holds as many letters at any width. Measured: 311 px on a desktop
  and 356 px on a phone for headlines of 16 to 149 letters (a phone grows
  21 px past some 125 letters rather than set the headline under 20 px).
- **The places read as places**: „din județul Sibiu", „din județele Cluj,
  Timiș", „din București"; with a locality, the county follows it („din
  Sibiu, județul Sibiu"). A CUI keeps its capitals („cu CUI 36804600"); a
  size range never parts at its dash.
- **The filters panel opens on the financial situation** (owner): the
  fiscal year and the measure as in the head (one shared dropdown each), then
  a range of values that starts on that measure — no second dropdown naming
  it, another measure a click away („Pe alt indicator") — the filing and the
  size; then which companies, where, what they are, what ANAF observed. The
  measure and a range stay two controls: the measure is what is summed and
  ranked, a range which companies are kept (ranked by turnover, kept by a
  profit above zero).
- **The dropdowns in the panel** (the owner found them hard to open and
  close): the sheet's overlay spans the screen and kept the pointer while a
  list was open, so the click that closed the list closed the panel too — the
  overlay now closes the sheet only when the sheet was the layer dismissed
  (`SheetContent`, shared). On a touch screen the year and the measures are
  the phone's own picker under the same box: Radix's list closes on a window
  resize (a keyboard going away) and placed itself under an open keyboard.
  The panel's fields are 16 px on a phone, so iOS does not zoom on focus.
  Known follow-up: the live page's head keeps its own year and measure
  dropdowns (the years with their statement counts) beside the panel's
  shared ones until the prototype's head is promoted.
- **A phrase's ✕** (shared with the registry and procurement): the
  registry's look — Lucide's X, muted, no ring, no shadow — on a round patch
  of the page's background, in front of the text (a chip with a ring and a
  shadow was tried and dropped). From `sm` it shows on hover, centred on the
  phrase's end and lifted above the line; on a phone it follows the phrase. The chip and the X are empty inlines, not
  buttons: a line may break on either side of an inline block, so a `<button>`
  ✕ could start a line beside the next phrase (or leave its comma to start
  one); inline, it breaks with its last word.

The companies with no common county, locality or state in the ONRC edition
are the API's basis groups (`bucket.basis`), named and drilled as the
section of 4 October says; the prototype draws them muted and leaves them
off the maps, counted under the legend.

## The analysis page promoted (12 October 2026)

`/companies/analytics` is the prototype's page (`propozitie`), on dev's
analytics (the ONRC edition's basis groups, the derived activity, the
registry-scoped company picker).

### Where the code went

- `components/analytics/company-analytics-page.tsx`: `CompanyAnalyticsView`
  (the head, the notices, the pinned bar, the figures, the answer, the
  years, the source, the filters panel) and the route's page around it.
- `hooks/use-company-analytics-page.ts`: everything the page reads and every
  way it moves, from an address — the route's
  (`useCompanyAnalyticsRouteAddress`) or the design harness's; the
  prototype keeps only its address (`analytics.data.ts`) and draws the
  promoted view, so it shows what is live.
- `analytics-head.tsx`, `analytics-add-filter.tsx`, `analytics-answer.tsx`
  (the modes, the figures, the tabs, the years), `analytics-axis.tsx` (an
  axis ranked), `analytics-charts.tsx`, `analytics-maps.tsx`; pure rules in
  `lib/company-analytics-sentence.ts` (the headline), `-suggest.ts` (the
  search box), `-states.ts`, `-order.ts`, `-answer.ts` (the tabs, shared
  with the server read).
- Replaced: the old head, the figures band and the breakdown table.

### Decisions taken at promotion

- **How the answer is shown is in the address** (`mod`: `harta`,
  `grafice`; the table without it), and the route's server read follows the
  first view under the page's keys: the map's groups (by county, by
  locality in one county), the companies sorted for the chart, an axis's
  groups as many as the table (15) or the chart (10) shows, the years.
- **The ranked axis keeps the old table's substance**: the derived activity
  (a tab of its own where the release offers it, ANAF's code beside it as
  „CAEN ANAF"), its names with source and quality, its unclassified buckets
  apart, the ranking choice, the CSV, the totals, the notes on what a
  grouping describes and where its names come from. Its rows are one rule
  (`breakdownRows`: ranked, apart, unclassified), shared with the chart, and
  a release without the derived activity says so in both.
- **Ranked by a count, the count is shown and drawn**: by the companies with
  a statement or by those that reported, the last column (and, on a phone,
  the line under the figure) is that count, and the bars follow it.
- **The four figures are exact** on hover and to a screen reader; a measure
  nobody reported is a dash that says so. The sum says how many companies
  reported it, and the mean is „per company that reported".
- **The groups without a common value read as the panel says them**: „fără
  un județ comun" for any reason, „fără un județ comun (valori diferite în
  înscrieri)" for a basis group — never a key. A single place is one value:
  a basis group or a value with the companies without one keeps its axis's
  tab, and the map shows one county's localities only for a county it knows.
- **A phrase's ✕ removes that filter only** — one range of several, one part
  of the ONRC observations.
- **A ready question is asked afresh**: the reader's year, release and view,
  nothing of the last question's order; on the map, a question that is not
  about places opens in the table.
- **The tabs are tabs**: arrows move between them, Enter or a click opens
  one (each is a read), one Tab stop, the answer their panel.
- **The caveats stay behind the one marker**, all of them (the old head's
  „Ce trebuie știut" included), with the edition the attributes come from.
- **The years as a table** carry the chart's actions: the series into the
  chart builder, and the CSV.
- **The hub opens the view its band shows**: the counties' map on the map
  (the companies-with-a-statement layer on the table ranked by them: the
  analysis's map draws a measure's sum), the years' trend as the chart; the
  figures and leaders as the table. The chart builder's link back opens the
  years as the chart.
- **The search box finds companies by name** under a registry pin of its
  own and only in the analysis's ONRC edition — the panel picker's rule.
- The company profile names a legal form from the same list as the
  analysis's filters (`lib/company-legal-forms.ts`).

## The hub rebuilt from the Zeus design (12 October 2026)

`/companies` is again the hub designed on Zeus (old branch
`companies-hub-redesign`, commit 065f2825): its hero, figures band, domains,
counties, births and starting points, rendered from the client's snapshot —
on dev the other machine's analytics-read hub (`company-hub-analytics`,
`hub-figures`, `hub-trend`, `company-hub-bands`) is gone. The owner chose the
snapshot: the figures change once a year, render on the server in full for
search engines, and cost the reader no request.

### Decisions

- **The years are the analytics release's, frozen.** „Economia, an de an"
  (new band 03, tabs: turnover, net result, employees) reads the companies
  analysis release's qualified series (2008–2025), frozen in the snapshot by
  `scripts/generate-companies-hub-snapshot.mjs` from the public API. The raw
  production sums the rest of the snapshot reads are unfit for years:
  - one company (CUI 42443305) filed a 2020 turnover of 300 trillion lei and
    a net profit of 291 trillion (held by the release as a reviewed suspect
    statement);
  - insurers' 2024 statements (layout `9dbe…`, not admitted) carry an amount
    where the headcount goes: +1,071,725 „employees" below the 50,000 ceiling;
  - keyed headcounts such as 999999999999999.
  The release holds those back. It has no magnitude threshold, so a few
  absurd headcounts remain (1.33 million from three 2011 statements, 122,690
  from one in 2025): the generator reads employees within 0–50,000, the
  ceiling the rest of the snapshot keeps (`EMPLOYEE_CEILING`).
- **Two sources, said.** The years count the legal persons of one ONRC
  edition with the values the release admits; the figures band adds every
  statement for the year. The band says so under its span, and the sources
  line names the release.
- **The chart.** One bar a year on the INS charts' parts (ticks, grid, axis,
  tooltip, `useChartReading`, which now reads equal slots: `bands`). The
  publishers' break (Ministry of Finance to 2018, ANAF from 2019) is a dashed
  rule with its names over it; the last year, with fewer filers than the one
  before, is hatched and said; a loss hangs below zero; the reading gives the
  exact figure, the change from the year before and who reported it. Net
  result's change is a difference in lei, never a percent of a small base.
- **Show more opens the analysis.** The leaders show their ten, then
  „Toate firmele, în analiza bilanțurilor"; the domains show ten, then
  „Toate activitățile…" (the analysis's ANAF codes). A domain row is not a
  link: the analysis filters exact codes, never a division.
- **The old directory is no longer linked.** The figure „Firme în
  funcțiune", the hero's shortcut, each county and the three starting points
  open the same selection in the analysis (`lib/hub-analysis-links.ts`, the
  snapshot's year, the selection in canonical order). The analysis counts
  one ONRC edition's companies, so its counts can differ from the hub's.
