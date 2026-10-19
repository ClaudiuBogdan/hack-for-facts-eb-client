# Election page (`alegere`) — rationale (2026-10-14)

Prototype: `/development/elections/alegere?v=<surse|functii|scrutine>&alegere=<eventKey>[&editie=<electionKey>]`.
Proposed live path `/elections/$event` (e.g. `/elections/local/2024`). Replaces the live
catalog's edition page (`/alegeri/$electionKey`), which it links from every edition column
(the external-link icon).

## The reader's questions, ranked

1. **What election is this, and is it really in the data?** — the title from the event key,
   one computed sentence, the family's years at the right (this one marked), the calendar
   gaps said as „nu e în date" (labelled Transparenta.eu's calendar), prev/next of the family.
2. **Which sources describe it and how do they differ?** — editions as **columns**, never a
   total column; the publisher is a hint from the key's prefix (said so, ask 1); the family
   label conflict is shown in the column („parliamentary ≠ europarlamentare").
3. **What was elected, at which level, in which round?** — offices × levels matrix with the
   source's round labels in the cell; a cell opens the filtered row list.
4. **Find a place / an office in the rows** — the live `electionContests` list, filtered only
   by labels the edition reports (G6), paged, exact total; a place finder (index, browser-only)
   that lists the place's rows in this election and links each to its contest.
5. **What is missing?** — the fourth figure is a dash („Rezultate —"); the audit's notes (E1,
   2024 parliamentary = candidate list, 1998 partial) sit **under the sentence** as a ruled
   note on those three events only, and in the caveats marker everywhere.
6. **Where did the source report?** — SIRUTA rows by INS county, said as „locuri de
   raportare", never races; the unlisted codes as a muted row.

## Variants

- **`surse` — sources side by side as the spine.** Head: edition switch top right (A/B…),
  the family's years as the aside. Bands: 01 editions table (columns) → 02 matrix of the
  chosen edition → 03 rows → 04 counties → 05 family. Argues: the first thing a reader must
  learn is that an edition is not an election.
- **`functii` — the offices × levels matrix as the spine.** Head: the editions as compact
  ranked rows in the aside (the footnotes). 01 one matrix across **all** editions (each cell
  stacks A/B/C with the round; nothing added) → 02 rows (edition switch in the band) →
  03 counties → 04 editions table → 05 family. Argues: „what was elected where" is the
  question; the sources are context.
- **`scrutine` — the finder as the spine.** Head: the place finder under the sentence (a
  found place shows its rows in this election), the edition's offices as quick filters in the
  aside. 01 rows → 02 counties → 03 editions → 04 matrix → 05 family. Argues: the reader
  comes with a locality or an office in mind.

No variant shows sample results (the brief allowed at most one; left as an open question).

## Data and why each figure is safe (§12.3)

| Figure / band        | Data                                                                                                                                      | Rule                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Ediții de date       | `catalog.fixture.json` editions grouped by `eventKey` (`shared/model.ts`)                                                                 | counted as editions, never elections                           |
| Rânduri de scrutin   | the **page's edition's** `contests` (never a sum over editions); label says „ediția A"                                                    | rule 1, 3                                                      |
| Localități raportate | `alegere/event.fixture.json`: distinct SIRUTA keys of the page's edition; named = matched on the code in `public/assets/geojson/uat.json` | rule 5; a dash when the edition has no SIRUTA rows             |
| Rezultate            | —                                                                                                                                         | rule 7: missing is a dash, never 0                             |
| Editions table       | fixture counts by office × scope × round; `nullLabels`, distinct keys per level                                                           | labels shown as stored; family conflict named                  |
| Matrix               | `editionMatrix(edition)` from the counts                                                                                                  | per edition; `all` mode stacks, never adds                     |
| Rows list            | live `electionContests(electionKey, {reportedOffices, scopeTypes, reportedRounds})`, pageSize 20, `total` exact                           | only filters the API applies                                   |
| Counties             | fixture `siruta.byCounty` (INS county by SIRUTA code)                                                                                     | „locuri de raportare"; codes the INS list lacks as a muted row |
| Place rows           | `shared/places.fixture.json` rows [edition, office, round]; contest key composed (see below)                                              | links by code, never by name                                   |
| Family               | `familyRun` over events; gaps from `shared/calendar.ts`                                                                                   | absent is „nu e în date"                                       |

**Contest key composition.** `contestKeyOf(edition, office, scope, sourceScopeKey)` =
`contest:<edition>:<office with - for _>:<scope>:<slug of the key>`; checked against all
105,340 cached rows (0 mismatches). Used only by the place finder's links. Ask: serve the
contest keys of a place (ask 10) so no page composes a key.

**Generated fixture.** `scripts/generate-elections-alegere-fixture.mjs [--cache <dir>]`
writes `alegere/event.fixture.json` (49 KB): per edition `rows`, `nullLabels`,
`siruta {distinct, named, byCounty[[mn, county, places, rows]]}`, `distinct` keys per
other level. Read from the lead's cache on 2026-10-14.

**Copied from shared.** `ElectionFigures` mirrors `HubFiguresBand`'s markup with a nullable
value (a dash); `Band` is the justice court page's band grid. Nothing in `shared/` was edited.

## Findings

- The head sentence lists each edition's rows („6.415, 6.415, 6.415, 2 și 2") — on
  `ro:local:2014` this shows the three identical AEP layouts at a glance (E25-like).
- `bec-local-2024` has three `tur2` rows: `local_election:siruta` ×2 (Chețani, …) and
  `mayor:county:1` (Alba): the API's `reportedRounds: ["tur2"]` with `mayor` + `siruta` is 0 —
  a repeat and a runoff cannot be told apart (E23), as §12.2 says.
- Two source labels share one Romanian word (`county_council` / `consiliu-judetean`,
  `bucharest_general_council` / `consiliu-general`, `general_mayor` /
  `bucharest_general_mayor`): the page shows the source key beside the word for the aliases,
  else two rows read as one. Ask 6 (canonical office) would remove this.
- The API cannot filter a null round (`reportedRounds` takes strings): the „tur neraportat"
  choice is offered (it exists in the edition) but the list then says it shows every round.
  Ask: accept null in `reportedRounds`, or serve an `unreported` token.
- Four editions have no publisher hint in the key (`locale-2000`): the sentence then says
  nothing about the publisher; ask 1 stands.

## Open questions for the owner

1. Which spine? (`surse` is the safest under §12.3; `functii` reads fastest; `scrutine` is
   the most useful once results land.)
2. Should the audit note (E1 etc.) stay as a ruled note under the sentence, or only behind
   the marker? The brief asked for prominence on 2014; the owner's taste says one marker.
3. A sample-results band („where results will go", `MockBadge`) was left out; wanted?
4. Live path: `/elections/local/2024` (family/year) needs an instance segment for
   `ro:local:1998:partial` (`/elections/local/1998/partial`?).

## Status

- `yarn -s eslint` on the page's files: clean. `yarn -s typecheck`: no errors in `alegere*`;
  errors in other authors' files (`analize/parts.tsx` TS2345, `localitate/model.ts` and
  `scrutin/model.ts` `replaceAll` needs lib es2021).
- SSR: `curl …?v=surse` carries the title, the sentence, the figures, the tables; the row
  list and the place rows render pending on the server (live/browser reads).
- Checked at 1440 and 390: `ro:local:2024`, `ro:local:2014`, `ro:presidential:2019`,
  `ro:parliamentary:2024`, `ro:parliamentary:2016`, `ro:local:1998:partial`, `ro:european:2019`.
