# Companies hub (`/companies`) — design record

**Status:** candidates, 16 September 2026. Nothing decided yet. The hub is
rebuilt as prototypes under `/development/companies/*` so several
compositions can be compared; the winner is promoted per
[`prototyping.md`](../prototyping.md).

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

## Prototypes (16 September 2026)

`src/development/prototypes/companies/hub.prototype.tsx`, three compositions
over the same modules. Judge each alone:

| Variant | Link | Shape |
|---|---|---|
| `editorial` | `/development/companies/hub?v=editorial` | The landing's rhythm: hero with search and the status strip, figures band, then one numbered band each for sectors, counties (map beside list), investigations, sources. |
| `atlas` | `/development/companies/hub?v=atlas` | The map is the hero, beside the search and the top-5 counties; figures band; sectors with status and investigations in the side column. |
| `compact` | `/development/companies/hub?v=compact` | Short header, search, figures as a strip, then hairline tiles: sectors, counties with a small map, status, investigations. Least scrolling. |

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
