# Parliament data-linkage audit — link inventory & verification

Audit of every cross-dataset link in the parliament domain, as exposed to the
client. **Ground truth = prod psql (read-only) + the live GraphQL API on
`:3001` + the client mappers.** Measured 2026-06-17 against `transparenta_prod`.

- Schema: `parliament.*` (16 tables) + `legal.acts` (via the kernel act loader)
  + `core.*` identity/territory (NOT yet wired for parliament — see notes).
- Layers: **DB** = FK/column · **API** = server resolver/repo · **CLIENT** =
  mapper/derive in `src/features/parliament/api/`.

## Datasets (row counts, 2024 legislature where relevant)

| Table | Grain | Count |
|---|---|---|
| `members` | one mandate (mandate_key) | 472 (2024); 5,289 all |
| `persons` | cross-mandate identity | 467 distinct for 2024 |
| `parliamentary_groups` | group row | 73 |
| `group_membership_intervals` | mandate×group×interval | time-sliced |
| `votes` | one division | 20,672 |
| `vote_records` | one ballot (member×vote) | 4,156,243 |
| `bills` | one bill | 9,935 |
| `bill_act_links` | bill→act edge | 9,050 |
| `bill_vote_links` | bill→vote edge | 8,987 |
| `bill_events` / `bill_documents` | per bill | — |
| `control_items` / `speeches` / `member_initiatives` / `member_declarations` | per mandate | 1.4M speeches |
| `person_identity_candidates` | review queue | — |

## Link inventory

Legend — cardinality, the **JOIN KEY actually used**, and the **layer** that
correlates. ✅ verified correct, ⚠️ defect (see Defects).

| # | Source → Target | Join key (real) | Card. | Layer(s) | Status |
|---|---|---|---|---|---|
| L1 | members → parliamentary_groups (roster) | `members.group_id` (FK) | N:1 | DB FK; API list; CLIENT groupId | ✅ D1 CLOSED (client fetches both chambers) |
| L2 | members → group_membership_intervals (dated roster) | `mandate_key`+`group_id` (FK) | 1:N | DB FK; API `groupIntervals` | ✅ |
| L3 | members → persons (cross-mandate identity) | `members.person_id` (FK) | N:1 | DB FK; API `person` | ✅ (5 persons hold 2 mandates) |
| L4 | members → constituency/territory | `members.constituency_name` (TEXT, NOT siruta) | — | DB column; API filter | ✅ name-only; NO core.territory link (gap) |
| L5 | member → votes (ballots) | `vote_records.mandate_key` (FK, name-resolved `exact_token_set`) | 1:N | DB FK; API `member.votes` / `vote.ballots` | ✅ key-correct, 99.9% resolved |
| L6 | member → speeches | `speeches.mandate_key` (FK) | 1:N | DB FK; API `member.speeches` (quarantined excluded) | ✅ |
| L7 | member → control_items | `control_items.mandate_key` (FK) | 1:N | DB FK; API `member.controlItems` | ✅ |
| L8 | member → member_initiatives | `member_initiatives.mandate_key` (FK) | 1:N | DB FK; API `member.initiatives` | ✅ |
| L9 | member → member_declarations | `member_declarations.mandate_key` (FK) | 1:N | DB FK; API `member.declarations` | ✅ |
| L10 | vote → bill | `votes.bill_key` (FK; numeric OR `senat:` prefixed) | N:1 | DB FK; API `vote.bill` | ✅ (8,420/20,672 votes carry a bill) |
| L11 | bill → vote (audited) | `bill_vote_links.{bill_key,vote_key}` (FK both) + `role` | N:M | DB FK; API `relatedVotes`/`voteLinks` | ✅ role `final_adoption` etc., all `linked` |
| L12 | bill → legal act (lineage) | `bill_act_links.target_act_id` → `legal.acts` (kernel loader) | N:1 | DB; API `actLinks`/`actLineage` (gated `resolution_status='linked'`) | ✅ status-gated; null-safe |
| L13 | bill → bill_events / bill_documents | `bill_key` (FK) | 1:N | DB FK; API `events`/`documents` | ✅ |
| L14 | vote → group breakdown / tally | aggregated from `vote_records.group_name` + `votes.{pentru..}` | — | API derives; CLIENT sums | ✅ breakdown sums to tally (verified 275/277) |
| L15 | ballot → member | `vote_records.mandate_key` (FK) | N:1 | DB FK; API `ballot.member` | ✅ D2 CLOSED (client pages ballots past 200) |
| L16 | act → related votes (marquee) | `bill_act_links` ⋈ `bill_vote_links` on `bill_key`, gated `linked` | N:M | API `parliamentActLineage` | ✅ |

### Key correctness notes
- **L5/L15 name-vs-id:** `vote_records` carries raw `member_name`/`group_name`
  (inconsistent casing/order, e.g. "ABRUDEAN Mircea" vs "Mircea Abrudean") AND
  the resolved `mandate_key`. The LINK is `mandate_key` (FK-enforced, resolved
  via `exact_token_set`), NOT the name — correct. Name collisions exist
  (e.g. two members normalize to "alin bogdan stoica"); the resolver leaves
  ambiguous ballots unmatched (0 votes each) rather than mis-assign — safe.
- **L12 lineage gating:** `bill_act_links.resolution_status` ∈
  {`linked` 3,066, `not_applicable` 5,802, `unresolved` 182}. Lineage + `hasLaw`
  gate on `linked`; `actLinks` returns all statuses with `legalAct=null` when not
  resolved, so the client never presents an unresolved edge as a real act
  (verified bill 12983: finalLaw 56 but `legalAct=null`, no false link).
- **L4 territory:** members link to a constituency NAME only; there is no
  `core.territory`/SIRUTA correlation in the parliament domain (and ballots carry
  no constituency at all — known server gap from the wiring report).

## Representative chains (deep-tested end-to-end)

### LAW TRACKING
1. **Legea 423/2023 (happy path) — PASS.** bill `12760` (plx 237/2012) →
   `finalLawNumber=423/2023` → `bill_act_links` linked → `legal.acts` `145905`
   "Legea nr. 423/2023" → `bill_vote_links` → vote `cdep:29892` (final_adoption,
   adoptat). Tally 275/0/1/1, present 277; **group breakdown sums exactly to
   tally**. `parliamentActLineage(145905)` round-trips to bill 12760 + that vote.
2. **Bill 12983 (non-happy: law number but UNRESOLVED act-link) — PASS.**
   finalLaw 56/2021, `actLinks[0].resolutionStatus='unresolved'`, `legalAct=null`
   → client summary uses the cdep law number, presents NO fake legal-act link.

### MEMBER ACTIVITY
1. **Abrudean (1:2024:1, Senate/PNL) — PASS.** API `activityCounts`
   {votes 1084, speeches 6252, control 0, initiatives 31, declarations 0} ==
   psql exactly; `votes` connection `total` 1084 == activityCounts.votes; first
   listed memberVote's ballot resolves to the same `mandate_key` + choice.
2. **Enache (2:2024:100, Camera/AUR) — PASS.** activityCounts
   {votes 1403, speeches 273, control 2, initiatives 79, declarations 2} == psql;
   connection total 1403 matches; his ballot in `cdep:37100` = `abtinere` (row
   240) matches his memberVote choice — **only after paginating ballots past
   row 200** (see D2).
3. **Rejected vote `cdep:37075` (non-happy) — PASS.** outcome `respins`
   (pentru 10 / impotriva 179), maps to UI `respins`; breakdown present.

## Defects (ranked)

### D1 — {CLIENT} group list uses chamber-agnostic endpoint → wrong groupIds + hub counts
**Status: CLOSED (2026-07-06).** `loadAllGroups()` now fetches BOTH chambers
explicitly (`camera_deputatilor` + `senat`) and merges — the no-chamber aggregate
is never used, so groupIds, per-chamber labels, hub counts (335/137), and the
members group filter are all correct regardless of the server shape.

`loadAllGroups()` calls `parliamentGroups(legislature:"2024")` with **no
chamber**. The server intentionally returns that as a party aggregate ACROSS
chambers: `groupId = name` ("PSD"), `chamber = ""`, `memberCount` = 133 (both
chambers). The client's `mapGroup` defaults `chamber "" → camera`, so:
- group list has wrong ids ("PSD" not "psd-senat"/"psd-camera_deputatilor") and
  every group is labeled `camera`;
- **hub `memberCountByChamber` = {camera: 472, senat: 0}** (should be 335/137) —
  visible bug;
- members **group filter** breaks: selecting "PSD" infers chamber=camera and
  drops Senate PSD.
**Evidence:** API no-chamber → `{groupId:"PSD",chamber:"",memberCount:133}`;
chamber-scoped → `{groupId:"psd-senat",chamber:"senat",memberCount:39}`. Summed:
broken 472/0 vs fixed 335/137.
**Fix (client, self-contained):** `loadAllGroups()` fetches BOTH chambers
explicitly (`camera_deputatilor` + `senat`) and merges → 16 groups, correct
per-chamber ids, hub 335/137. Robust regardless of the concurrent server fix
(#118), since it never relies on the no-chamber shape.

### D2 — {CLIENT} vote-detail ballot list truncated at 200
**Status: CLOSED (2026-07-06).** `fetchParliamentVoteDetailLive` now pages the
ballots connection on `pageInfo.endCursor` (200/page, capped at `MAX_BALLOTS`=500)
and assembles the full `memberVotes` list before mapping — votes with >200 ballots
(golden cdep:29892 = 277) render every member ballot.

`fetchParliamentVoteDetailLive` requests `ballots(first: 700)`, but the server
caps the ballots connection at **200/page** (`parliament-repo.ts:893`). **10,617
votes have >200 ballots** (max 447; golden cdep:29892 has 277), so the
per-member ballot list on the vote-detail page is silently truncated to 200 for
those votes. (Tally + group breakdown are separate complete fields — unaffected;
the truncation is only the member-level `memberVotes` list.)
**Fix (client):** paginate ballots in `fetchParliamentVoteDetailLive` on
`pageInfo.endCursor` up to a sane cap (~500) to assemble the full `memberVotes`.

### Not defects (verified clean)
- L5/L15 name-based resolution is FK-backed by `mandate_key`; collisions are
  left unmatched, not mis-joined.
- L12 unresolved/not_applicable act-links never surface as real legal-act links.
- Quarantined speeches (0 today) are server-filtered; no leak.
- Outcome/rejected votes map correctly; `amânat` is UI-only and never sent.

## Web cross-check (DB/API vs cdep.ro / senat.ro, the authoritative source)

Per the "don't trust the DB alone" methodology — checked representative entities
against the official public sources to catch internally-consistent-but-wrong data.

| Entity | DB/API | Official (cdep.ro / senat.ro) | Verdict |
|---|---|---|---|
| Abrudean `1:2024:1` group/chamber/county | PNL / senat / CLUJ | PNL, Senat, Cluj (Senate President) | ✅ match |
| Mitrea `2:2024:200` group/county | AUR / NEAMŢ | AUR, circ. 29 NEAMŢ | ✅ match |
| AUR Senate group size | 28 | 28 (senat.ro group page) | ✅ match |
| Senate group "PACE" (12) | PACE | "PACE - Întâi România" — REAL group formed Sept 2025 (Onea: SOS→neafiliat→PACE) | ✅ match (DB is CURRENT, beats stale post-election snapshots) |
| **Camera chamber size** | **335 mandate rows** | **331 seats** (331 distinct persons) | ⚠️ SC-1 |
| **Senate chamber size** | **137 mandate rows / 136 persons** | **134 seats** | ⚠️ SC-1 (+realignment) |

### SC-1 — {DB / scrapper} replacement mandates inflate the chamber-size count
**Status: FIXED server-side (2026-07-06).** `parliament.members` now carries an
`is_current` flag + `mandate_end_date` / `mandate_end_reason`, and the server
exposes a `current: Boolean` argument on `parliamentGroups` / `parliamentMembers`
(+ `isCurrent` on the member type). The client uses `current: true` for all
composition/roster/headline surfaces (hub shows 330/134 current seats, AUR 90),
while attribution/voting-history keep every mandate row. Historical replacement
mandates are retained for vote attribution but no longer inflate the chamber size.
The original analysis is kept below for context.

`parliament.members` keeps a row per MANDATE, including superseded ones (a member
resigns/is replaced → both the original and the substitute mandate_key are kept),
with **no active/superseded flag** on the row (`attrs.status` / `mandate_end` /
`end_reason` all empty; the only signal is a later mandate for the same
`person_id`). So counting member rows over-reports the chamber:
- Camera: **335 rows vs 331 current seats** — 4 replacement pairs (e.g.
  Ciolacu Ion-Marcel `2:2024:59` → Matache Oana `2:2024:334`; Afloarei → Năcuţă).
  `count(distinct person_id)` = 331 (matches the official 331).
- Senate: 137 rows / 136 persons vs official 134 (1 replacement: Jianu → Oprea;
  the residual 136-vs-134 is the Sept-2025 group realignment / source snapshot
  date, not a row defect).
The client hub and `parliamentMembers.total` surface the **mandate-row count**
(335/137), so the UI shows "335 deputați / 137 senatori" where the real current
chamber is 331/134. **Layer = DB/scrapper (extractor keeps replacement mandates
without an active flag); NOT fixed in this slice.** Proposed fix (future): add an
`is_current` / `mandate_end` signal on `members`, and have the server count/`total`
over current mandates (or distinct persons) for "chamber size", while keeping the
historical rows for vote attribution. Flagged with both numbers per methodology.

(All member/group/constituency LINKS themselves verified correct against the web;
this is a count-semantics defect, not a wrong-link defect.)

## Deferred follow-ups (2026-07-06 serving sweep)

The serving-sweep pass (AI summaries, committees, contact CV, freshness) closed
D1/D2/SC-1. The items below were consciously left for a later slice — each notes
what is missing, the layer that owns it, and the concrete first step.

- **L4 constituency → SIRUTA join.** Member constituency is a free-text județ
  name (`constituencyName`), not linked to the `core.territory` SIRUTA hub, so
  members can't be correlated to territory-keyed data (budgets, procurement by
  county). *Owner: scrapper data-layer (+ a server resolver once keyed).* *First
  step: add a `siruta` column on `parliament.members` populated via the existing
  county-name → SIRUTA fold used elsewhere, then expose it on the member type.*

- **Alegeri tab content (elections domain).** `/parlament/membri/$memberId/alegeri`
  has no live backing — the electoral result (votes received, share, list
  position) lives in the elections domain, which is not yet loaded/served.
  *Owner: scrapper data-layer (elections) → server.* *First step: finish the
  elections raw→prod slice, then add a `member.electionResult` field keyed on the
  person spine + constituency + election date.*

- **Member portraits + email/phone.** No official portrait image or direct
  contact (email/phone) is captured; the contact tab shows only the profile URL
  and now the CV PDF. *Owner: scrapper extraction lane.* *First step: add a
  cdep/senat member-profile extraction lane that stores the portrait object
  (MinIO, content-addressed) + any published contact fields, honoring the
  privacy_class policy (personal contact = restricted, still stored).*

- **Agendas / sittings API.** Committee meeting *agendas* and plenary *sittings*
  are not exposed — `meetingsCount` is a scalar, with no drill-down to dates or
  documents. *Owner: server (additive contract binding), reading current data.*
  *First step: bind a `committee.meetings` / `sittings` connection behind the
  additive-only contract (is_current=true only for the active legislature) and
  wire a client sub-route.*

- **Vote-type facet (procedural vs final) on the member votes filters
  (deferred 2026-07-06, member-votes heatmap slice).** The votes filter panel
  offers date/choice/outcome/session but no "vote type": the only source signal
  is `votes.attrs.vote_action`, free-text with ~36% coverage, CDEP-only, and
  absent for all Senate votes — measured live before deciding *(user decision:
  defer)*. *Owner: data layer (scrapper) — needs a bucketing/classification lane
  over `vote_action` + a Senate-side signal before serving.* *First step:
  sample-audit `vote_action` values (≥30 stratified rows), define a controlled
  vocabulary, and add a classified column to the raw/prod votes tables
  additively.*

- **Speech search (`PARLIAMENT_SPEECH_SEARCH_MODE=off`).** Full-text search over
  plenary speeches is disabled server-side; the intervenții tab lists a member's
  speeches but there is no cross-member speech search. *Owner: server + search
  (OpenSearch/pgvector projection).* *First step: build the speech search-doc
  projection, flip `PARLIAMENT_SPEECH_SEARCH_MODE=on`, and add a search surface
  (deferred until the speech corpus is enrichment-complete).*
