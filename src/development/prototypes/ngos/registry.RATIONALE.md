# `/ngos/registry` in the analytics page's language — rationale

Prototype: `/development/ngos/registry` (`?v=intrebare`, `?v=lista`), live on
the dev API. Built 2026-09-30 against `docs/design/ngos/design.md` §12–§14 and
the procurement analytics page (`dev`: `docs/design/procurement/design.md`
§18, `src/features/procurement/components/analytics/`).

## 1. What a reader brings to a national NGO registry

Ranked by how often a non-expert (journalist, citizen, public-sector clerk)
asks it, and by what only the registry can answer:

1. **Does this organisation exist, and is it still in the registry?** A name
   in a press release, a donation page, a grant list. The registry's unique
   value is existence plus status (registered / dissolved / in liquidation /
   struck off) — and „registered" is not „active".
2. **Which is it, among the namesakes?** Two food banks, three
   „Asociația Sfântul Nicolae": the county, the locality, the registry number
   and the legal form disambiguate.
3. **Which NGOs are in my county / town, and how many?** Local reporting, a
   citizen looking for a club or a foundation nearby.
4. **Which ones have been struck off, dissolved, or are being wound up — and
   recently?** The registry's status plus its date.
5. **Which are of public utility?** The 693 the export marks.
6. **What kinds are they — associations, foundations, federations?**
7. **How many are there, and is the number growing?** Already the hub's
   answer (`/ngos`: figures, counties, years); the registry page restates it
   only for the selection.
8. **Does it have a CUI, can I follow the money?** The record page's job
   (`sourceCui`, `linkedOrganizationCui` → `/ngos/$cui`).

The first two are lookups; 3–6 are selections; 7 is a figure. So the registry
page's answer is **a selection of records with the figures that are true of
that selection**, not a ranking. That is what the prototype builds.

## 2. How the analytics pattern maps onto a registry

| Analytics page | Registry page | Why |
|---|---|---|
| The question as the headline, each filter a phrase (click opens the panel, ✕ drops it) | Same: „Fundațiile radiate din județul Cluj cu „kirali” în nume" | The query is five filters and a status; a sentence says it better than chips. Agreement is safe: every subject (ONG-urile, asociațiile, fundațiile, federațiile, persoanele) takes the feminine plural. |
| The period, top right | The export's date („Export din 20 septembrie 2026") | The registry has no period: it is one export. The date is what a reader must know. |
| The populations in the pinned bar (direct purchases / contracts / frameworks) | The **status** in the pinned bar: Toate · Înregistrate · Dizolvate · În lichidare · Radiate | A choice, not a sequence; the reader must pick which registry they mean. Default „Toate": a search by name must find a struck-off NGO, and the hub's existing links carry `status` explicitly. |
| Four figures of the selection | Up to four figures **true of the selection** (§4) | Never a figure estimated from part of a selection. |
| The answer: records / ranked table / chart in time, tabs for the axis | **Înregistrări** (the records) always; **Pe județe / localități / forme / stări / ani** for every selection its filters leave open | The API cannot group, so the registry is counted whole ahead of time (§4). A name search is grouped from its own complete read (≤ 2,000 rows); past that its tabs are off and say why. |
| The years band | Dropped | No year filter in the API; „Pe ani" gives any selection's years by registry number instead. |
| „+ Adaugă un filtru" omnibox | Same, over counties, legal forms, statuses, public utility, words in a name, a registry number | |
| „Filtre" sheet (right / bottom on a phone), „Șterge tot", „Arată N" | Same, all six fields | |
| „Întrebări" | Ten ready questions with their traps | |
| Notes marker (amber with count / „i") | Same: unread address, late export, a summary of another export, a capped count, a question's trap; then the facts | |
| „Sursa: … · Cum am calculat" | „Sursa: Registrul național ONG, Ministerul Justiției, export din … · Cum am numărat" | |
| Every control writes the address | Same, **in the route's existing keys** (`q`, `county`, `category`, `status`, `registryNumber`, `publicUtility`) | Every link the hub already makes (figures, forms, statuses, start cards, search) opens the new page unchanged; promotion is a drop-in. |

What stays a plain searchable list: the records themselves — the export's
order (registration date, newest first; the API has no other), 25 a page, a
row opening `/ngos/registry/$recordId`. Variant `lista` is that alone under the
same head, with the count under the question and the status as a quick row.

## 3. The API, verified (dev-chronos-api, 2026-09-30)

Introspection is off; probed with deliberate errors and real queries.

- `ngoRegistryRecords(filter, first: 1..100, after)` → `edges{cursor node}`,
  `pageInfo{hasNextPage endCursor}`, `snapshot`. **No `totalCount`, no
  `sort`/`orderBy`/`offset`/`last`/`before`.** 80–150 ms a page.
- `NgoRegistryFilter`: `name: {contains}` (diacritics ignored), `county: {eq}`
  (the registry's spelling, exact), `category: {eq}`, `status: {eq}`,
  `registryNumber: {eq}`, `publicUtility: {eq: Boolean}`. Not accepted:
  `legalForm`, `year`, `court`, `locality`, `cui`, `isBranch`,
  `registrationDate`, `specialRegistryNumber`, `in`, `startsWith`,
  `registryNumber.contains`.
- `ngoRegistryRecord(id)`; `ngoRegistryCoverage` → the snapshot
  (`955ec3c867a0507797c73c9f`, captured 2026-09-20, `refreshOverdue: true`,
  `nationalCompleteness: unverified`, 141,330 rows) — the same export the
  client summary (`registry-summary.ts`) was built from, which the page checks
  at runtime before using a summary figure.
- Order: `sourceRowNumber` ascending = registration date descending (checked
  on every read below).
- Queries run:
  - `name contains "funky"` → 1 row: FUNKY CITIZENS, 1471/A/2012, București, no CUI.
  - `name contains "banca pentru alimente"` → 2 rows (Maramureș 2021 with CUI, București 2016).
  - `county CLUJ + status Radiat` → 356 rows in 4 pages, 0.7 s (354 after 2 exact repeats).
  - `county CLUJ + category foundation + status Inregistrat` → 1,247 rows, 13 pages.
  - `name contains "club sportiv"` → past 1,000 rows in 10 pages, 1.4 s.
  - `publicUtility true + status Inregistrat` → 696 rows (693 after repeats — matches the summary).
  - `first: 101` → `INVALID_INPUT`; `county "DAMBOVITA"` → nothing (the export spells it `DÂMBOVITA`; the page normalises a typed county through the summary's spellings).

## 4. What the figures may say (the data-trust rules)

Two exact sources, never an estimate:

- **A. The registry counted whole** (`features/ngos/registry/data/registry-counts.json`, 889 KB, ~134
  KB gzipped, built by `scripts/count-ngo-registry.mjs` from a full capture):
  every entry counted by county × locality × legal form × status × public
  utility × registry-number year × declared CUI, 37,703 cells. Loaded as
  its own chunk by this page only, and used only while the live
  `snapshot.id` equals its `snapshotId`. It answers every selection the
  filters make except a name or a registry number, at once: the count, all
  five breakdowns, and the figures. The table then reads only the pages it
  shows (2 requests for Cluj · Radiate, not 4; 1–2 for the registry, not 20).
  Checked against the hub's summary of the same export in tests: the total,
  each status, each form and each county's registered, the registered
  without a county, every year 2001–2025 — all equal — and against the live
  reads below (Cluj · Radiate 354, Cluj · fundații · înregistrate 1,247).
- **B. A complete live read** for a name or a registry number: the
  selection page by page up to `READ_CAP_PAGES` (20 pages, 2,000 rows).
  Under the cap the count and the breakdowns are exact (repeats dropped);
  past it the count is „2.000+", the tabs are off with the reason, and the
  list goes on paging. The same read is the fallback when the counts belong
  to another export or fail to load.

The band then shows: the count; for the country or a county, the hub's
context (registered, new in 2025, per 10,000 residents, the county's rank);
for any other selection, what the tally says (the registered among them
where the status is open, counties or localities, entries with a CUI, the
newest registry year).

Every count is by the year in the registry number, never the registration
date (design.md §12). A year before 1990 or after the export (`1005`,
`3009`, `2034`: 46 entries) is a typing slip and counts as no year.
Localities are shown as people write them („SECTORUL 3 - BUCURESTI" →
„Sectorul 3") and one town under several spellings („ALBA IULIA", „ALBA
IULIA - AB") is one row; the registry's missing diacritics stay missing.

## 4b. The filters panel, as procurement's (2026-10-01)

The owner asked for the „Filtre" panel to follow the procurement analytics
panel they approved (`docs/design/procurement/design.md` §18.18, on
origin/dev from b5043092). Its parts and combobox keyboard are copied into
`registry.filter-parts.tsx` (`analytics-filter-parts.tsx`,
`use-active-option.ts`); `src/components/ui/sheet.tsx` takes the same
`closeClassName` change. On promotion, lift those pieces into one shared
place rather than keep two copies — the owner's call.

- **Groups**: Registrul (Starea) · Ce organizații (Forma, Utilitate publică)
  · Unde (Județul) · Care (Numele, Numărul). Each row a label and one
  control; a value set is a chip with its own ✕; no per-section „Șterge";
  the header counts the filters as the „Filtre" button does.
- **Every control 44 px on a phone, 40 from `sm`**, the sheet's close too.
- **Forms**: the three common ones, the rare two (211 religious associations,
  42 foreign legal persons) behind „Arată mai multe".
- **The place picker, county only**: the registry API filters `county.eq` in
  its own spelling and has no region list or locality filter, so the county
  is the only level offered. Before a word is typed it lists the 42
  counties, one a row with its code (the owner, 2026-10-01; procurement
  browses as a grid); typing matches names with or without diacritics
  (cedilla or comma), a code typed whole first („cj" → Cluj); Enter picks
  the first. The chip names the kind: „Jud. Cluj", „Municipiul București".
  Regions and localities join once the API can apply them.
- **Keyboard and states as procurement's**: combobox with
  `aria-activedescendant`, options out of the Tab order, Escape closes an
  open list and not the sheet, focus moves to the new chip or field after a
  pick or a ✕, an always-mounted live region, „Niciun județ pentru „…”."
- **Phone lift**: a field focused on a phone moves to the top of the sheet,
  with room below to scroll there.
- **Two fixes beyond procurement's** (sent to that session, its panel has
  both): a list closed or a field turned into its chip on blur waits until
  the focus has landed (otherwise Radix's focus scope takes it to the sheet,
  and a tap on the next field gives no focus and no phone keyboard); the
  list's scroll box is out of the Tab order.
- **Names from 3 letters**, as the head's search; a registry number is said
  wrong once the reader leaves the field, not from the first digit.
- **A county the registry does not spell** (`?county=Atlantida`) is reported
  as unread and filters nothing; `Satu-Mare` reads as `SATU MARE`.
- **The sheet no longer remounts** at each filter: the page keeps its state
  across selections (the table's page resets per selection), so a filter set
  in the sheet leaves it open, its focus in place.

## 5. Verified in the browser (Playwright, `scratchpad/verify.cjs`)

390 / 768 / 1440 px, no horizontal page scroll anywhere, no console errors:
the default page, Cluj + Radiate (with Pe ani / Pe localități / Pe forme),
„banca pentru alimente", Cluj foundations (1,247, complete), the empty answer
(`?simuleaza=gol`), the failed read (`?simuleaza=eroare`, said once, retry),
the slow read (`?simuleaza=lent`), an unread address (`?status=activ`, amber
2), the filter sheet from the bottom on a phone and from the right on
desktop, the omnibox, the notes popover, and `lista`. SSR checked with curl:
the headline, the controls and the figures band are in the HTML.

After the counts (2026-09-30, real CSS): every tab of the registry, Înregistrate,
Cluj · Înregistrate, Cluj · Radiate and „banca pentru alimente" at 390 and
1440 px, no horizontal scroll, no console errors; „club sportiv" keeps its
tabs off past the cap. The tabs scroll on one line on a phone.

## 6. Gaps — what to ask the server for

1. **A count** on `ngoRegistryRecords` (`totalCount`), so a name search
   needs no walk and the cap goes away.
2. **A breakdown** (`ngoRegistryBreakdown(filter, by: county | locality |
   category | status | numberYear)`) — it would retire both generated files
   (`registry-summary.ts`, `registry-counts.json`) and their refresh step,
   and break down name searches of any size.
3. **A year filter** on the registry number (`numberYear: {eq | gte | lte}`)
   and a **date range** on the registration date.
4. **A locality filter** and a **court filter**.
5. **`in` filters** (several counties, several statuses).
6. **Sort** (name, registration date, registry number).
7. **A CUI filter / `hasCui`**, for the money question.
8. **The county spellings** as an enum or a lookup, so the client stops
   carrying them.
9. Diacritic-folded `county.eq` (or a `county.contains`).

## 7. Open for the owner

- **`intrebare` or `lista`?** The owner chose `intrebare` (2026-09-30); `lista`
  stays as the design record.
- **Default status „Toate"** (the registry) vs „Înregistrate" (what most mean).
  The hub's links say the status; a name search should find a struck-off NGO;
  so „Toate". The bar makes the switch one tap.
- **The cap** (2,000 rows / 20 requests) now applies only to a name search;
  with a count and a breakdown endpoint it disappears.
- **The counts file** is refreshed with each new export, like the hub's
  summary: run the capture, then `count-ngo-registry.mjs`. Until then a new
  export turns the page to live reads (the notes say so).
- **Noi în 2025** counts the selection's own entries numbered 2025: 4,331 for
  the registry, 4,306 for „Înregistrate" (the hub's 4,331 is of every status).
- **The export's year is running**: „Pe ani" draws 2026 paler and says
  „până la 20 septembrie 2026" when it is the year shown.
- **The overdue-export alert** is on for every page load while
  `refreshOverdue` is true: honest, but the marker will be amber for weeks.
  Alternative: an „i" fact until the export is more than N days old.
- **The table's page is not in the address** (as on the analytics page); a
  `pagina=` param would make page 7 a link, at the cost of reading 7 pages.
- **Whether „Pe localități" rows should filter** — the API has no locality
  filter, so they are figures only (the arrow shows where a row narrows).
