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
| L1 | members → parliamentary_groups (roster) | `members.group_id` (FK) | N:1 | DB FK; API list; CLIENT groupId | ⚠️ D1 (client uses no-chamber group list) |
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
| L15 | ballot → member | `vote_records.mandate_key` (FK) | N:1 | DB FK; API `ballot.member` | ✅ but CLIENT truncates list — ⚠️ D2 |
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
