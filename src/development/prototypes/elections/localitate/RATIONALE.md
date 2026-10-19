# Locality page — rationale (prototype `elections/localitate`, 2026-10-14)

One place = one SIRUTA code (`?loc=`, default 54975 Cluj-Napoca), proposed live
path `/elections/places/$siruta`. Record page in the profiles' shape (G1, G2, G3,
G8): compact head, figures band, numbered bands, one source line with the caveats
marker, the INS locality page as a 32px icon action (loc de raportare).

## The reader's questions, ranked

1. Which elections and offices do the sources report at this place, year by year,
   with the round as reported — and where does a row open? (every cell/row links
   to `PROTOTYPE_HREF.contest(contest:<edition>:<office _→->:siruta:<code>)`, the
   pattern the shared generator verified on every SIRUTA row).
2. Which rows are **reporting locations, not this place's race** (county
   president/council, CGMB, Chamber, Senate reported per locality).
3. Where editions overlap (two or three editions of one election).
4. What is missing: elections in the data with no row here (and why that can be),
   elections not in the data at all (hand-kept calendar, said as ours), and the
   source-numbered rows that cannot be matched without a name join (said once, in
   the notes).
5. Other places of the same county (INS list) to move to; a search to switch.

## Shared frame (all variants)

- **Head** renders on the server from `names.fixture.json` (name, kind, county,
  event count; 108 KB raw / 30 KB gzip, written by
  `scripts/generate-elections-localitate-names.mjs` from the shared places
  fixture, never from the API). The sentence is computed: „Comună în județul Cluj.
  Sursele raportează aici 8 alegeri, din 1996 până în 2024, în 13 ediții de date.”
  On the server it stops after the event count; the years and editions need the
  1.2 MB index, which loads in the browser only (`usePlaces`). A code the INS list
  lacks says so under the title and in the sentence, with the source's own label.
- **„Raportată în”** aside: each family's years here, newest first, `×n` for
  several editions, the disputed „2014” in quotes with ✱ (E1).
- **Figures** (unit-named, each linking to a band): alegeri raportate aici
  (platform events with a row), ediții de date, rânduri de scrutin, alegeri din
  date fără rând aici. Pending bones on the server.
- **Fără rând aici** band (variants A, B): three lists — reported per locality but
  not at this code (value = SIRUTA codes reported, „localități”, never races);
  reported only wider (county / source numbering / abroad / country); not in the
  data per Transparenta.eu's calendar (marked „de confirmat”).
- **Alte localități din județ**: INS county siblings, largest kinds first, the
  page's own marked, value = events reported there; 12 shown, „Arată toate (81)”.
  No county for a code outside the INS list — said, never guessed.
- **Source line** at the foot: `commonNotes()` + scope ≠ race, source-numbered
  rows excluded, INS link = reporting location, the unnamed-code note, and the E2
  note only for a sector that carries `local_election` rows.

Office roles (`model.ts`): `own` (mayor, local council, general mayor), `wider`
(county president/council, CGMB, Chamber, Senate, president, EP, referendum),
`source` (every table-shape label, shown verbatim in mono + „(etichetă din sursă)”).

## Variants

- **`matrice`** — offices × elections matrix. Rows grouped by role, columns per
  election reported here (chronological), a chip per edition and round in each
  cell, the editions' keys in the foot of each column. Argues: the reader asks
  „which offices, which years” and wants one glance; two editions of one election
  are two chips side by side, never one number. Scrolls sideways on a phone under
  a sticky first column.
- **`cronologie`** — a timeline of the elections reported here, newest first; one
  column per edition with its rows (own offices first, then „loc de raportare”,
  then source labels). Argues: a citizen reads by election; the overlap of editions
  is visible as parallel columns.
- **`comparatie`** — every catalog election, newest first: what is here, how many
  SIRUTA codes it is reported at, and the scope types the source uses. Argues:
  absence must be explained in place („— nu la acest cod” vs „— nu pe
  localități”), so the page needs no separate band for it.

## Data behind each figure (why it is safe under §12.3)

- Events are platform groupings (`eventKey`), said as „alegeri … grupate de
  platformă”; editions are counted as editions; rows as „rânduri de scrutin”.
  Nothing is added across editions (figures count distinct keys).
- „Localități raportate” = distinct SIRUTA codes with a row in any edition of the
  event (the same unit the shared figures use), never a count of races.
- Rounds are shown as labels (`final`, `1`, `—` for null = „tur neraportat”).
- Nothing joins on names or county codes; the INS link follows the reported code.

## Findings (new, with evidence)

1. **Parliamentary 2020 reports București as one place under code 179132**, not
   per sector: `aep-parliamentary-2020` and `bec-parliamentary-2020` have no row
   for any of the six sectors (179141…179196) but have `chamber_deputies`/`senate`
   rows at 179132; 2016 reports per sector. 179132 is not in today's INS UAT list
   (the list has the six sectors only). Both 2020 parliamentary editions label it
   „BUCUREŞTI SECTORUL 6” — the name of 179196, Sector 6 in the INS list — and
   `bec-local-1996` labels it „Municipiul BUCURESTI” — a source labelling
   question for the scrapper. The places fixture keeps „Municipiul BUCURESTI”:
   for a code the INS list lacks, the generator passes over a label that a
   listed code also carries (2026-10-19 fix; the first label used to win).
2. **Băneasa (Constanța) sits under two codes**: the 2020 editions (both local and
   both parliamentary) key it as 63171 (label „BĂNEASA”, not in the INS list);
   61069 (INS) has every other edition and no 2020 rows. Name-only match; never
   joined. The same place therefore reads as „6 alegeri” at 61069.
3. **Five codes are reported only by `bec-local-1996`** and are absent from the INS
   list: 10809 USUSAU, 60605 23 AUGUST, 82323 STOINA, 139973 TREZNEA, 146986
   MILISAUTI — each has a same-name INS code today (10765, 60598, 82314, 179631,
   146931). Old SIRUTA codes, most likely; said as „nu e în lista INS de azi”.
4. 238 INS places have no 1996 row; `bec-local-2008` and `bec-local-2012-archive`
   report per SIRUTA only for the six sectors (all else by source numbering);
   `roaep-election-databases-local-2024` has SIRUTA rows for two communes only
   (6468 Poșaga, 116046 Chețani, `polling_station_results`).
5. `aep-parliamentary-2016` files its per-locality rows under the office label
   `local_election` (shown verbatim as a source label).

## Server asks (adds to §12.4)

- Ask 10 (contests by place) is what this page needs live: a filter on
  `sourceScopeKey`, or a `placeContests(siruta)` read, instead of a 1.2 MB index.
- A stable place name per SIRUTA row (ask 8) would retire the name map.
- Flag the code aliases (179132, 63171, the 1996 codes) as issues, or serve a
  canonical SIRUTA beside the reported one.

## Open questions for the owner

- Is the `names.fixture.json` trade-off (30 KB gzip for a server-rendered head and
  county list) wanted, or should the head too wait for the index?
- Should `comparatie` replace the „Fără rând aici” band in the other two variants?
- Office roles are a client-side table (`own`/`wider`/`source`); the API has no
  such field — keep it, or ask the server (ask 6)?

## Notes for the lead

- Nothing in `shared/` was changed. The names generator reads only the shared
  fixtures.
- Dev-server trap: after an edit, the **first** page load can get the previous
  Tailwind CSS (a new utility shows only on the next load). Reload before judging
  a class-only change.
