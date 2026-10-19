# Elections results API: proposed contract

Status: **proposal from the client, 2026-10-19**, for the server session.

The live elections API serves catalog metadata only: editions and contest rows,
with readiness pinned at `results: UNAVAILABLE` and no votes, mandates or
turnout (design note §12.1). This contract covers the reads behind the results
pages.

The client already renders those pages on extracts of the production DB
(read-only, 2026-10-15). Connecting the API means adding a results adapter
in `src/features/elections/api/` (there is none yet; the catalog's reads live
there) and pointing the pages' data hooks at it; no UI rewrite should be
needed.

- **Pages it serves:**
  - `/development/elections/principal` (the main results page);
  - `/development/elections/componente-fable` (the 24-component gallery);
  - `/development/elections/rezultate` (the analytics page with the county
    filter and the party focus).
- **Fixtures it replaces** (under
  `src/development/prototypes/elections/principal/`):
  - `results.summary.json`, `results.uat.json`;
  - `results.evolution.json`, `results.evolution-uat.json`.
- **Background:**
  - design note §12.2 (what the data holds);
  - §12.4 (server asks 1–16);
  - §12.9 (asks 17–20, the evolution findings);
  - §12.10 (the analytics page);
  - the data-gap hand-off of 2026-10-15 (the gaps per election), kept
    outside the repo; its findings are summarised in §6 below and in the
    design note.

## 1. Rules the API must carry, not the client

These are product requirements (DESIGN.md §Data Trust). The API has to make
them answerable; the client only shows them.

1. **One edition at a time.** Every figure belongs to one `electionKey`, so a
   read never sums across editions. Where two editions describe one election,
   the API names a reference edition per event and office (`referenceEdition`)
   and the client reads that one.
2. **Missing is never zero.** An absent figure is `null` with a reason code
   (§5), never `0`. A competitor absent from a tally is absent; the API does
   not pad it with zero rows.
3. **Labels are reported.** Party, office, round and place labels come as
   `reported*`. A `verified*` twin stays null until verified. Grouping
   competitors into party lines is the platform's own work and is labelled
   that way (§3.6).
4. **No people.** Tallies are by competitor (a party, an alliance, or
   "independent candidate" as one bucket). No candidate names, no
   officeholders, no person keys, no `attrs` or raw payloads, and no joins of
   people across sources. Mandates are counts per competitor.
5. **A status per figure.** Every tally and turnout point carries `status`
   (`VERIFIED | UNCHECKED | SUSPECT`) and `issues`. Today's derived turnout is
   at best `UNCHECKED`.
6. **Count lines, not final results.** Results from polling-station lines (PV)
   say so (`basis: PV_LINES`). A tie in the counted votes is a tie, not a
   result.

## 2. The vocabulary

| Term | Meaning |
|---|---|
| `electionKey` | an edition, as in the catalog (`aep-local-2020`) |
| `eventKey` | the platform's grouping of editions into one election (unverified) |
| `office` | canonical office: `chamber`, `senate`, `president`, `mayor`, `local_council`, `county_council`, `county_council_president`, `european_parliament`, `referendum` (ask 6) |
| `round` | `1`, `2`, or null when the edition has one |
| scope | where a figure is counted: `NATIONAL`, `COUNTY` (`countyCode`), `UAT` (`siruta`, today's INS list), `DIASPORA` |
| `competitorKey` | a stable key per competitor across editions (a party actor, or an alliance with its members), or `~independent`; never a person |
| party line | the platform's grouping of competitors over time (PSD with PSD+PC in 2008, USR with USR PLUS in 2020) |

**County codes** are today's two-letter INS codes (`CJ`, `B`). An edition
whose own county numbering differs (§12.2, per-edition county codes) is
mapped server-side; the code the API serves is always INS.

## 3. Reads

Each read exists three ways, like the catalog: a GraphQL root, a REST route
under `/api/v1/elections/`, and an MCP tool. All are read-only.

A finished edition's results don't change, so replies may be cacheable (an
`ETag` per edition plus `Cache-Control: public, max-age`), unlike today's
`no-store`.

### 3.1 `electionTally`: votes or mandates for one scope

The tally of one office in one edition for a set of scopes (national, the
counties, abroad).

```graphql
electionTally(
  electionKey: String!
  office: Office!
  round: Int
  measure: VOTES | MANDATES!
  scopes: [ScopeInput!]!          # ≤ 50; e.g. [{type: NATIONAL}, {type: COUNTY, countyCode: "CJ"}]
  limit: Int                      # keep the top N competitors, fold the rest into ~other (default: all)
): [ScopeTally!]!

type ScopeTally {
  scope: Scope!                   # type, countyCode, siruta, label
  status: FigureStatus!           # VERIFIED | UNCHECKED | SUSPECT
  issues: [String!]!
  basis: TallyBasis!              # ALL | LINKED (only rows linked to a competitor; ask 17) | PV_LINES
  rows: [TallyRow!]!              # sorted by value, descending
  totals: TallyTotals             # null when the source has none
}
type TallyRow { competitorKey: String!, reportedLabel: String!, partyLine: String, value: Int! }
type TallyTotals { registered: Int, voted: Int, valid: Int, invalid: Int, blank: Int }
```

- **Folding:** `~other` stays one row (with `folded: Int` competitors), so the
  client never mistakes a folded party for an absent one. Today the county
  Chamber rows keep seven parties plus `~other`; the analytics page labels a
  missing party "în „Alte partide"" for that reason.
- **Mandates:** with `measure: MANDATES`, `value` is a mandate count. For 2024
  that means mayors (1 per UAT), local councillors, county councillors and
  county council presidents (1 per county).
- **Replaces:**
  - `summary.local2024.mayors.mandates`, `.councillors`, `.countyCouncillors`,
    `.countyCouncilVotes`;
  - `summary.parliamentary2020.chamber`, `.senate` (national, `byCounty`,
    diaspora);
  - `evolution.chamber[year]` and `evolution.mayors[year]`;
  - `evolution.localCouncillors[year]` and `evolution.countyCouncillors[year]`.

### 3.2 `electionUatTable`: one value set per UAT, columnar, for maps

The maps and every UAT-level chart need all ~3,190 UATs at once. A columnar
reply keeps that at map-snapshot size (the INS hub's map figures are about
57 KB gzipped).

```graphql
electionUatTable(
  electionKey: String!
  office: Office!
  round: Int
  measure: VOTES | MANDATES!      # MANDATES: `leader` is the mandate's competitor; the vote columns are null
  columns: [UatColumn!]!          # which arrays to return
  partyLines: [String!]           # for LINE_SHARES: the lines, in this order
  countyCode: String              # optional: one county's UATs only
): UatTable!

type UatTable {
  siruta: [String!]!              # today's INS list; aligned with every column
  status: FigureStatus!
  issues: [String!]!
  leader: [String]                # competitorKey of the most-voted, "~tie" on a tie
  leaderShare: [Int]              # ‰ of valid votes
  margin: [Int]                   # ‰ between the first two
  gap: [Int]                      # votes between the first two (exact)
  runnerUp: [String]              # competitorKey of the second
  valid: [Int]
  competitors: [Int]              # how many ran
  registered: [Int]
  voted: [Int]
  lineShares: [[Int]]             # per UAT, ‰ per requested party line
}
```

A UAT the source lacks gets `null` in every column, never zero.

- **Replaces:**
  - `results.uat.json`: `local2024Mayors` (leader, share, margin, valid,
    competitors), `parliamentary2020Chamber`, and the 2020 and 2019 turnout;
  - `results.evolution-uat.json`: `chamber2016/2020` (line shares),
    `turnout2016/2020`, `mayors2024Race` (runner-up, gap).
- **Mayors 2016:** `mayors2016` is a mandate column. It comes from the same
  read with `office: mayor, measure: MANDATES` (`leader` = the mandate's
  competitor).
- **Place types:** `kinds` (R/M/O/C/B) belongs in the place read (§3.7), not
  here.

### 3.3 `electionCloseRaces`: the closest races

```graphql
electionCloseRaces(
  electionKey: String!
  office: Office!                 # mayor
  round: Int
  countyCode: String
  limit: Int = 15                 # ≤ 100
): [CloseRace!]!

type CloseRace {
  siruta: String!, placeLabel: String!, countyCode: String!
  first: String!, second: String! # competitorKeys (a tie names both)
  gap: Int!, valid: Int!          # gap in votes; 0 = a tie in the counted lines
  status: FigureStatus!, basis: TallyBasis!
}
```

Order: `gap` ascending, then `valid` descending. The client reproduced the
national top 15 exactly from the UAT columns this way, so this read is a
convenience and a check. `placeLabel` is the place, never a candidate.

### 3.4 `electionTurnoutSeries`: turnout over time

```graphql
electionTurnoutSeries(
  families: [Family!]             # parliamentary | presidential | local | european | referendum
  scope: ScopeInput = {type: NATIONAL}
): [TurnoutPoint!]!

type TurnoutPoint {
  electionKey: String!, eventKey: String!, family: Family!, year: Int!
  round: Int                      # the round the figure is for (today: unverified; ask 20)
  registered: Int, voted: Int
  status: FigureStatus!, issues: [String!]!
  basis: DERIVED | PV_LINES | PUBLISHED
}
```

- **Replaces:**
  - `evolution.turnout` (1992–2024);
  - `summary.*.turnout.byCounty` (with a `COUNTY` scope);
  - the diaspora voters (with a `DIASPORA` scope).
- **Excluded:** a point the platform judges broken (European 2014, partial;
  local 2012, 97.9%; the 2007 referendum, two summed) is still returned, with
  `status: SUSPECT` and its issue. It is never silently dropped. The client
  chooses what to draw.

### 3.5 `electionCoverage`: what can be compared

The evolution charts depend on which editions have usable results. The client
hard-codes this today (Chamber 2008/2016/2020; mayors 2016/2020/2024). Serve it.

```graphql
electionCoverage(office: Office!, measure: VOTES | MANDATES!): [CoverageRow!]!
type CoverageRow { eventKey: String!, year: Int!, referenceEdition: String, state: USABLE | LINKS_MISSING | LINKS_WRONG | ABSENT, issues: [String!]! }
```

This is how the gaps show as hatched columns, not zeros:
- Chamber 1992–2000 and 2012: `LINKS_MISSING`;
- Chamber 2004: `LINKS_WRONG` (UDMR at 62%);
- Chamber 2024: `ABSENT`;
- presidential 2024/2025: `ABSENT`.

### 3.6 `electionCompetitors` and `partyLines`: names and lineage

```graphql
electionCompetitors(keys: [String!]!): [Competitor!]!   # ≤ 500
type Competitor {
  competitorKey: String!, reportedLabel: String!, shortLabel: String
  kind: PARTY | ALLIANCE | INDEPENDENT | MINORITY_ORG
  members: [String!]              # an alliance's member actors (ask 18)
  partyLine: String
}

partyLines: [PartyLine!]!
type PartyLine { key: String!, label: String!, basis: PLATFORM_GROUPING, members: [LineMember!]! }
type LineMember { competitorKey: String!, from: Int, to: Int }  # years the member stands for the line
```

- **Labels:** short labels replace the client's `shortName()` title-casing of
  long alliance names.
- **Fixes needed first:** ALDE's two keys and the 2004 alliance links (ask 19).
- **Colours:** a line's colour stays in the client (a design token, not data).

### 3.7 Places: SIRUTA, county, kind

`kinds` (county seat, municipality, town, commune, București) and place labels
come from the INS list the statistics hub already serves. Extend that read
with `kind`. An elections read should not repeat it.

## 4. Which read feeds which panel

| Page panel | Read |
|---|---|
| Figures band (national or county) | 3.1 mandates (mayors, county councillors); 3.4 turnout |
| Lines in time, party cards, gains and losses, 100% columns, ranking | 3.1 per year, from 3.5's usable editions; 3.6 lines |
| Mandate waffles, county council semicircle, local councillors | 3.1 mandates, national or `COUNTY` |
| County tiles | 3.1 mandates, all counties (`scopes`: 41 `COUNTY`) |
| Party strength map, change map | 3.2 `lineShares` for two Chamber editions |
| Kept or changed map, flow diagram | 3.2 `leader` for the 2016 mandates and 2024 votes |
| Turnout change map, turnout distribution | 3.2 `registered`, `voted` for two editions |
| Margins map, margin histogram, candidates per race | 3.2 `leader`, `margin`, `competitors` |
| Closest races | 3.3 (or 3.2 `gap`, `runnerUp`) |
| Turnout since 1992 | 3.4 national |
| County dumbbell | 3.4 per county for three editions |
| Voters abroad, home vs abroad | 3.4 `DIASPORA`; 3.1 diaspora scope |
| Turnout and party share by place type | 3.2 plus 3.7 `kind` |

The county filter needs no extra read: 3.1 takes a `COUNTY` scope, 3.2 a
`countyCode`, 3.3 a `countyCode`.

## 5. Status and issue codes

These codes extend the catalog's readiness vocabulary. A figure carries only
its own.

| Code | Meaning |
|---|---|
| `TALLY_LINKED_ONLY` | only rows linked to a competitor are summed (Chamber 2016: 96% of `voturi` rows are unlabelled columns) |
| `TURNOUT_RECOMPUTED` | turnout recomputed from registered and voted, not published |
| `TURNOUT_VALID_EXCEEDS_VOTED` | `turnout_derived.valid` > `voted` (2016, 2020; ask 20); `valid` is withheld |
| `ROUND_UNVERIFIED` | the round of a presidential point is the edition's, unchecked |
| `SOURCE_CONFLICT_MODAL_PICK` | conflicting source files; the most frequent value was taken (Alba/Mureș mayor files 9/28/107, 16 groups) |
| `PHASES_ASSUMED_ADDITIVE` | county council phase 1 + phase 2 summed |
| `CAPITAL_ROWS_MISSING` | the edition has no București rows (local 2024) |
| `UAT_UNMAPPED` | a source SIRUTA with no place in today's INS list (63171) |
| `REPORTED_YEAR_DISPUTED` | E1: the "2014" local editions hold 2016 data (ask 4) |
| `FOLDED` | the row is `~other` |

## 6. Coverage the client expects first

In priority order, based on what the pages show today:

1. **Local 2024:**
   - mayors: votes per UAT, mandates;
   - local and county councillors: mandates;
   - county council presidents: competitor per county;
   - turnout per UAT (missing today: §DATA-GAPS);
   - București's own rows (missing today).
2. **Parliamentary 2020:** Chamber and Senate votes by UAT, county and abroad;
   turnout.
3. **Chamber 2016 and 2008** (2016 `TALLY_LINKED_ONLY`); **mayors 2016 and
   2020** mandates; **councillors 2016**.
4. **Turnout series 1992–2024** with statuses.
5. **Presidential 2019** turnout per UAT.
6. **Next:**
   - Parliamentary 2024 votes (candidate lists only today);
   - presidential 2024 (annulled) and 2025 (absent);
   - European 2024 (raw absent).
   - These enable the 2024 columns the charts leave hatched.

## 7. Sizes

Measured on the fixtures:
- national and county tallies: ~130 KB raw (`results.evolution.json`);
- the UAT tables for four editions: ~680 KB raw (`results.evolution-uat.json`).

With columnar arrays and gzip, one edition's UAT table should land at about
60–90 KB, light enough to load per map on demand.

## 8. Open questions for the server

1. **Competitor keys:** are they stable across editions today, or per edition
   (ALDE's two keys suggest per edition)? The party lines depend on the
   answer.
2. **Reference edition:** where two editions cover one election, which does
   the API pick, and does it serve that choice as data?
3. **Independents:** one bucket per scope (`~independent`), or one row each
   with a non-person key? The client needs only the bucket.
4. **Close-race list:** is the PV-line `gap` exact in every county file, or
   only where the per-station lines sum cleanly?
5. **2016 mayors:** the 2016 mandates sit in the "2014" edition (E1). Should
   3.1 answer `electionKey: aep-local-2014-t1` with `REPORTED_YEAR_DISPUTED`,
   or wait for the corrected key?
