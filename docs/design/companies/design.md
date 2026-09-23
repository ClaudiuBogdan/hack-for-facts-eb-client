# Companies hub (`/companies`) — design record

> **Superseded in part on 23 September 2026** — see
> [§ The hub reads the economy, not the register](#the-hub-reads-the-economy-not-the-register-2026-09-23)
> at the end. The composition below stands; its figures, bands and data
> source changed.

**Status:** promoted, 17 September 2026. The `editorial` variant is live at
`/companies`; the prototypes under `/development/companies/hub` are deleted
with the promotion, losers included, per
[`prototyping.md`](../prototyping.md).

## Where the code went

> As promoted on 17 September. Since the 23 September rewrite, `hub-sections.tsx`,
> `county-map.tsx` and `use-company-county-counts.ts` are gone: the hub is
> `private-company-hub-page.tsx` over `hub-leaders`, `hub-sectors`,
> `hub-county-band` (`company-county-map` + `company-county-rank`) and
> `lib/hub-snapshot.ts`.

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
