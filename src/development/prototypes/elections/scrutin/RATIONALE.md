# Contest page (`scrutin`) — rationale

Prototype: `/development/elections/scrutin?v=<lineage|context|results>&scrutin=<contestKey>`
(default `contest:bec-local-2024:mayor:siruta:54975`). Proposed live path
`/elections/contests/$contestKey`; replaces `/alegeri/contest/$contestKey`.

## The reader's questions, ranked

1. **What is this row?** Office, place, round, edition, election — each as reported, in one
   sentence that reads aloud (G2), honest about the row's nature (a race's row as labelled,
   a reporting location, a roll-up, a source-table shape, the source's own numbering, abroad).
2. **Where are the results?** Not published: said in the figures band (a dash), in a results
   band (what will appear, no zero), and behind the marker.
3. **The same office at the same place in other years** — the SIRUTA join (the only safe
   one), grouped by the platform's election, editions side by side.
4. **Where it sits** — the election, its sibling editions, the place (INS name/kind/county,
   the source's spelling), with links to the election, place and INS pages.
5. **What else was reported at the same place in the same edition** — every office × round
   at the SIRUTA code, each said for what it is.
6. **The same office at other levels** — the edition's county/national rows, listed, not
   summed, not joined to the row's county.
7. **The identity as served** — every field, codes in mono (results variant's band 03).

## Variants

- **`lineage` — Istoric.** The row's history is the spine. Head → figures → 01 the same office
  at the same SIRUTA code in every edition (table: election, edition, round) → 02 the rows at
  the place in this edition → 03 the office's levels → 04 results (empty). Argues: a journalist
  landing on a mayor row wants to step through the years first.
- **`context` — Context.** Where the row sits is the spine. The head carries a four-step ladder
  (election → edition → place → row). 01 the election's editions side by side, with this row
  where it exists → 02 the place and what was reported there → 03 levels → 04 a compressed
  history (one line per election) → 05 results (empty). Argues: a reader who does not yet know
  what an "edition" is needs the ladder before any list.
- **`results` — Rezultate (probă).** The results-ready layout. The figures band is
  results-shaped (four dashes); 01 result, 02 turnout, 03 list seats (only for list offices)
  are **sample shapes**: `MockBadge` in each head, letters for names (Candidat A, Partidul B),
  dashes for every figure, bars by rank only; 04 the identity as served and 05 the history
  are live. Argues the layout, never the data. The only sample variant on this page.

## Data each figure uses, and why it is safe under §12.3

| Figure / band                     | Data                                                                                                                                                      | Rule                                                                                                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Head sentence                     | live `electionContest` (office, scope, label, round) + `catalog.fixture` (edition, event) + `places.fixture` (INS name/kind)                              | labels as reported; the round only once the live read lands (`…` before); E1 editions say „etichetată 2014, date din 2016"; publisher from the key prefix, said as a hint in the notes |
| Ediții cu acest rând              | `places.fixture` rows at the SIRUTA code, same office, grouped by `eventKey`; national rows from the fixture (`RO` is the one national key on 35/35 rows) | SIRUTA join only; counts editions and "grupări de alegeri" (platform groupings), never elections summed; `null` + note for diaspora/county/source_constituency                         |
| Funcții raportate aici, în ediție | distinct offices among the place's rows in this edition                                                                                                   | rows, not races                                                                                                                                                                        |
| Rânduri ale funcției în ediție    | fixture counts, same office, all scope types, one edition                                                                                                 | a row count within one edition; the levels band says "not a sum of the rows under it"                                                                                                  |
| Voturi, prezență, candidați       | —                                                                                                                                                         | dash + „nepublicate încă" (rule 7)                                                                                                                                                     |
| Levels (county rows)              | one live `electionContests` read, `reportedOffices`+`scopeTypes` filters, pageSize 100                                                                    | listed with the source's label and the edition's own code; the page never picks the row's county (rule 5)                                                                              |
| Sibling editions                  | event's editions from the fixture; this office's row via the place index                                                                                  | side by side, „fără acest rând" ≠ no election                                                                                                                                          |

Nobody is „ales"; `attrs`/payloads never shown; no source link; the readiness is constant
and sits behind the marker (rule 13).

## Findings

- **The contest key is deterministic:** `contest:<edition>:<office slug>:<scopeType>:<scope
key lower-cased, ':'→'-'>` (checked by the fixture generator on 105,340 rows). The page
  parses it, so SSR renders a real head („Primar · 54975 — Primar, la locul raportat 54975, în
  ediția BEC a alegerilor locale din 2024.") before the live row lands; the INS name and the
  round arrive with the browser reads. At promotion the loader seeds the query (G1) and the
  flash disappears.
- **National scope key is `RO` on every national row** (35/35, label „Romania"), so the
  national roll-up of an office in an edition is addressable from the fixture alone.
- **`source_constituency` keys collide with SIRUTA codes by shape** („1:1" → `1-1`); in
  `bec-local-2024` the mayor at `1:1` is labelled „MUNICIPIUL ALBA IULIA" and `13:1`
  „MUNICIPIUL CLUJ-NAPOCA" — the same race as `siruta:54975` under the source's numbering,
  joinable only by name, so the page says „nu se leagă".
- **`bec-local-2024` mayor county rows:** 41 (`county:1`…`41`, Alba with `tur2`, the rest a null
  round), plus `national:ro`; the fixture's `county_president` has 3,180 SIRUTA rows and 41
  county rows.
- **Shared `placeKind` misses Bucharest's sectors**: the INS kind is „Sectoarele municipiului
  Bucuresti", which does not start with „Sector" (`shared/labels.ts:99`). This page tests
  `startsWith('Secto')` in its own forms (`model.ts`) and a local `kindOfSector` in
  `context.tsx`; the shared helper should be fixed by the lead.
- **Copied helper:** `ContestFigures` in `parts.tsx` is `HubFiguresBand`'s cell markup with two
  states it lacks — a dash for `value: null` and a bone while an index loads (G3 asks for a
  dash, never 0). At promotion `HubFact.value` should accept `null`.
- `String.prototype.replaceAll` is outside this project's TS lib; use `replace(/…/gu, …)`.

## Server asks confirmed from this page

- Ask 5 (contest grain / role): the page infers the row's nature from office × scope type
  (`rowNature` in `model.ts`); a served role would replace the inference.
- Ask 10 (contests by place): rows at a place in an edition come from the 1.2 MB index in the
  browser only; a `sourceScopeKeys` filter would make band 02 a live read and SSR-able.
- Ask 8 (stable county key beside the edition's): the levels band could then mark the row's
  own county instead of listing 41 rows.
- Ask 1 (publisher per edition): „ediția BEC" is read from the key prefix today.

## Open questions for the owner

- Title form: „Primar · Cluj-Napoca" (office · place) vs the sentence alone as the title.
- Should the levels band list all county rows (41 chips) or only the count with a link to the
  edition's filtered catalog? Kept the list: it is the only way a reader finds „CLUJ 13".
- Results variant: keep the seats band only for list offices (as now), or always, empty?
- Is „grupări de alegeri" acceptable wording for the platform's event groupings in a figure
  note, given E1 (2014 = 2016 data) makes „alegeri" wrong by one?
