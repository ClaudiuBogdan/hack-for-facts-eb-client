# National budget: what is live

## Agreed finish line — September 25

Finish the already-parsed 2006–2007 batch (24 months, 730 facts), including
independent verification and production deployment, then move on to data.gov.
December 2008, September 2012 and November 2012 stay archived and unpublished;
their accounting differences do not justify more parser work in this milestone.
July 2019 remains a source gap. Keep these gaps visible; do not claim complete
historical coverage. This scope was explicitly agreed by the user.

## September 29 data.gov 2023 approved budget loaded, audited and retained

The 2023 budget law, as sent to the Monitorul Oficial, is now in production
with the same five forms. Production holds five editions: 2021, 2022, 2023,
2024 and 2025. This is not all years; 2020–2015 remain pending.

- **Table:** `budget.approved_budget_lines` gained **25,302** exact values in
  thousand lei (load run 28273): 9,181 approved for 2023, plus 5,453 / 5,361 /
  5,307 forecasts for 2024–2026. Totals: 25 interpretations and 122,375 lines.
- **Editions stay separate:** `budget_year` is the source law; `measure_year`
  is the approved or forecast year.
- **Raw:** 15,369 records and 61,476 slots; 36,174 blanks stay blank.
- **Unit evidence:** the reviewed 2023 prints, with masked glyphs completed
  only from two held legislatie.just.ro law pages. These are the original
  HTTP 200 research fetches of September 28, transferred into versioned
  custody as objects 2958–2959 with their original acquisition receipts.
  Object 2954 is the separate failed HTTP 500 attempt at the same URL; it is
  not a witness.

**Verified evidence:**

- **Audit:** the independent audit of the production export (five editions,
  three trusted release baselines) found 0 failures across 122,375 values,
  caught all 312 negative controls and passed all 5 positive controls.
- **Reconciliation:** the Job's ten sources and run receipt (objects
  2960–2970) and the two held transfers were read back by version. The
  exhaustive registry reconciliation explains all 13 new objects, one load
  run and one parity validation. The Job's catalog (2960) has the same bytes
  as object 2936, stored under a different (uncompressed) key; 2936 is
  unchanged.
- **Preservation:** a separate full-row proof shows every earlier 2021, 2022,
  2024 and 2025 row, the legacy registrations, ETL rows, constraint, ledgers
  and the BGC publication (241 months, 54,763 facts, 30,992 points)
  unchanged. The audit's own baseline check is semantic, not full-row.

The export, packet, receipts, audit report and component manifest are retained
in versioned S3 objects 2971–2975, with exact readback; post-retention checks
found every earlier archive row unchanged and zero unclassified objects. The
monthly CronJob is active and unchanged. Next, one year at a time: 2020 and
2019, then 2018 and earlier through 2015.
[Evidence](evidence/mfp-approved-budget-20260929/approved-2023-production.json).

## September 28 raw sources for 2023 and 2020–2015 retained; nothing new published

Production still publishes **four approved-budget editions** (2021, 2022,
2024, 2025): 20 interpretations and 97,073 lines. The other years are pending.

**Stage 1, available XML custody: done.**

- All 34 available XML forms for 2023 and 2020–2015 now have verified,
  versioned custody. 30 forms use 31 legacy objects; the four missing 2016
  forms were newly captured.
- Supporting catalogs, the 2018 contents document and six MF spreadsheets
  were captured.
- The capture plan is **held**: the 2023 law page 262868 returned HTTP 500,
  preserved as an attempt record, and 262870 was not attempted. Both are
  deferred.
- The 2015 state synthesis and the 2016 contents document were not found in
  the inspected official sources.
- The manifest and operation receipt are retained in objects 2956–2957.
  Every prior archive row and all approved, legacy and BGC state are
  unchanged.

[Evidence](evidence/mfp-remaining-capture-20260928/remaining-capture-production.json).

**Stage 2, financial qualification: open.** Nothing loads until these are
resolved and primary and Astra review the actual evidence:

- unit evidence per form;
- edition/version identity;
- older XML dialects;
- completeness.

## September 28 data.gov 2021 and 2022 approved budgets loaded, audited and retained

The 2021 and 2022 budget laws, as sent to the Monitorul Oficial, are now in
production beside 2024 and 2025, with the same five forms. This covers four
editions only, not all years.

- **Table:** `budget.approved_budget_lines` gained **48,043** exact values in
  thousand lei. Totals: 20 interpretations and 97,073 lines.
  - **2021:** 23,633 values: 8,403 approved for 2021, plus 5,143 / 5,095 /
    4,992 forecasts for 2022–2024.
  - **2022:** 24,410 values: 8,645 approved for 2022, plus 5,359 / 5,228 /
    5,178 forecasts for 2023–2025.
- **Editions stay separate:** `budget_year` is the source law; `measure_year`
  is the approved or forecast year. Forecasts from different laws for the same
  year coexist; never merge them with another edition's approved values.
- **Raw:** 28,181 records and 112,724 slots across the two editions; blanks
  stay blank.

**Verified evidence:**

- **Audit:** the independent audit of the production export (four editions)
  found 0 failures across 97,073 values and caught all 218 controls.
- **Reconciliation:** each edition's ten sources and capture-run receipt were
  archived and read back by version (objects 2908–2929). The exhaustive
  registry reconciliation explains every new object, exactly two load runs and
  two parity validations.
- **Preservation:** every 2024/2025 row, the legacy registrations and the BGC
  publication (241 months, 54,763 facts, 30,992 points) are unchanged.

The export, packet, receipts, audit report and component manifest are retained
in versioned S3 objects 2930–2934, with exact readback.

A later unrelated NGO migration (`20260926T200005`) makes the frozen verifier
refuse on ledger equality, and it stays refused. A separate read-only proof
found every approved, legacy, ETL, protected, BGC and archive row equal. That
proof, the ledger decision and the first retention receipt are retained in
object 2935 (SHA `92197a15…`), read back by version. The monthly CronJob is
active and unchanged. The user's next target is back to 2015, machine-readable
first; those years are pending.
[Evidence](evidence/mfp-approved-budget-20260928/approved-2122-production.json).

## September 26 data.gov 2024 approved budget loaded, audited and retained

The 2024 budget law, as sent to the Monitorul Oficial, is now in production
beside 2025, with the same five forms:

- **Table:** `budget.approved_budget_lines` gained **24,220** exact values in
  thousand lei: 8,754 approved for 2024, plus 5,310 / 5,216 / 4,940 forecasts
  for 2025–2027. Totals: 10 interpretations and 49,030 lines.
- **Editions stay separate:** `budget_year` is the source law; `measure_year`
  is the approved or forecast year. The 2024 law's forecasts for 2025 sit beside
  the 2025 law's approved values; never merge or overwrite them.
- **Raw:** 14,493 records and 57,972 slots; blanks stay blank.

**Verified evidence:**

- **Audit:** the independent audit of the production export (both editions)
  found 0 failures across 49,030 values and caught all 94 controls. 2024 unit
  pages without a text layer are checked against pinned, visually reviewed
  page renders.
- **Sources:** all ten 2024 sources and the capture-run receipt were archived
  and read back by version (objects 2890–2900).
- **Preservation:** every 2025 row, all prior archive rows, the legacy files and
  the BGC publication (241 months, 54,763 facts, 30,992 points) are unchanged.

The evidence is retained in versioned S3 objects 2901–2906 with exact readback;
object 2907 adds the September 28 recovery proof with its own member manifest.
An unrelated NGO migration applied later makes the frozen verifier refuse on
ledger equality; separate read-only proofs on September 28 found every approved,
archive, legacy and BGC row equal to the September 26 export. The monthly
CronJob is active and unchanged.
[Evidence](evidence/mfp-approved-budget-20260926/approved-2024-production.json).

## September 25 data.gov 2025 approved budget loaded, audited and retained

The 2025 budget law, as sent to the Monitorul Oficial, is now in production:

- **Forms:** state budget (synthesis and authority detail), and the pension,
  health and unemployment syntheses.
- **Table:** `budget.approved_budget_lines` holds **24,810** exact values in
  thousand lei: 8,976 approved for 2025, plus 5,491 / 5,216 / 5,127 forecasts
  for 2026–2028.
- **Raw:** interpretations preserve all 15,050 records and 60,200 slots, and
  blanks stay blank.

These are approved-plan and forecast observations, not execution. Do not sum them
across hierarchy levels. They are not joined to the legacy comparison view.

**Verified evidence:**

- **Audit:** the independent audit of the production export found 0 failures and
  caught all 37 controls.
- **Sources:** all ten were captured and read back by version, and so was the
  capture-run receipt.
- **Preservation:** the BGC publication (241 months, 54,763 facts, 30,992
  points) and the legacy approved facts are unchanged.

The export snapshot, receipts, audit, closure, methods and a component manifest
are retained in versioned S3 objects 2886–2889, with exact readback. The final
read-only check found the data unchanged and the monthly CronJob active and
unchanged. [Evidence](evidence/mfp-approved-budget-20260925/approved-production.json).

## September 25 bulletin rollout complete; monthly schedule active

Production now contains **241 selected months and 54,763 facts**, spanning
January 2006 through July 2026 with the explicit gaps below. The 2006–2007
batch added 24 months and 730 facts. The exact Job completed successfully:
24 historical additions, 162 historical replays and 55 modern replays; no
errors, pending acquisition or historical cohort holds. Forward readiness
passes through the source's July 2026 frontier.

The independent production audit matched all **730 new facts and 30,992
series points** against original documents and caught all 36 deliberate
corruptions. All 217 previous selections, their roots/children/contracts/seals,
2,415 earlier raw interpretations and 19,747 available points stayed unchanged.
Astra independently reviewed the results and evidence bindings.

Complete originals, snapshots, operation receipts and all 222 audit-method/input
files are retained in versioned S3, objects **2870–2874**, with exact readback.
This includes 23 bulletin ZIPs and the 108 supporting inputs missing from the
older methods archive. Source binaries remain outside Git.

The same CronJob is active on qualified image `08f16c3dd6a5…`, at **04:00 on
the 5th of every month, Europe/Bucharest**. Only its image and suspend flag
changed. Extraction is followed by guarded production loading. Temporary
rollout monitoring is finished; the persistent Claude session remains available.
[Production audit and retention receipts](evidence/mfin-history-20260925/bulletin-production.json).

This is not complete historical coverage. Unpublished months are December 2008,
September/November 2012 (deferred accounting differences), July 2019 (source
gap), January 2024 (missing BGC original), and May 2025 (incompatible source
qualifiers). Missing periods never become zeroes. Bulletin Sinteza/Nota candidates
remain unresolved; July 2006 partial coverage remains explicit in derived series.
The agreed national-budget milestone is complete; data.gov analysis is next.

## September 25 bulletin implementation qualification

The 2006–2007 extension is qualified for 24 months and 730 national BGC facts.
Independent review passed. Tests against the actual database schema preserved
all 162 historical predecessors; the new export keeps contracts, validation
results and financial data in one consistent database snapshot.

The independent audit matched all 730 new stored facts and 27,144 test-series
points, and caught all 36 deliberate corruptions. A separate check reproduced
all 27,976 points in the retained 217-month production snapshot from originals,
including the 55 modern releases. All repository checks, 11,153 unit tests and
413 contract tests passed.

Sinteza/Nota candidates remain explicitly unresolved; they are not treated as
absent or published as financial inputs. July 2006 retains its printed July 30
coverage, so unsupported full-month comparisons remain unavailable.

Implementation commit `d3759c80` and image `08f16c3dd6a5…` are ready. The image
passed runtime and decoder checks. Live read-only preflight found zero holds
across all 154 original historical months, eight later additions and 24 bulletin
months. The new exporter reproduced all 217 current heads, 27,976 series points
and catalog entries exactly against the trusted baseline.

This preparation preceded the guarded migrations and running Job recorded above.
Production auditing and complete S3 retention are still required before schedule
reactivation.
[Qualification](evidence/mfin-history-20260925/bulletin-qualification.json) and
[image/live preflight evidence](evidence/mfin-history-20260925/bulletin-preparation.json).

## September 25 eight more months deployed and audited

Production contains **217 selected months and 54,033 facts**. The eight new
months added 287 facts; all 209 existing selections were replayed unchanged.
The production Job completed with zero errors, no pending acquisition and no
holds in the reviewed historical cohort. The source frontier is July 2026.

Independent checks matched all 287 new stored facts and all 27,976 national
series points to the originals. All 18,832 previously available series points,
prior release/child/family-contract/seal digests and 2,389 raw interpretations
are unchanged. All 20 deliberate corruption checks were caught.

S3 objects **2808–2812** retain the complete 217-original export, before/after
snapshots, actual fact table, migration receipts, audit methods and supplementary
XLS evidence. Every object passed versioned readback. Source binaries remain
outside Git. An audit pod ran out of temporary storage during packaging; its
replacement repeated only the read-only export, without rerunning the load or
migrations.

The monthly CronJob is active on image `397676c9dff2…`, with the same schedule:
**04:00 Europe/Bucharest on the fifth of each month**. The target guard and
exact specification comparison confirmed that only its image and pause flag
changed. Raw `090003` and production `090001` are applied.

**Historical coverage remains incomplete.** The 2006–2007 bulletin extension
is being implemented in the same supervised Opus session. Other historical
holds and data.gov remain pending.
[Deployment and audit](evidence/mfin-history-20260925/pending8-deployed.json),
[versioned storage receipts](evidence/mfin-history-20260925/pending8-storage.json),
and [migration/start receipts](evidence/mfin-history-20260925/pending8-rollout-start.json).

## September 25 eight-month extension committed, rollout pending

Commit `5a0d4f53` qualifies eight additional months and 287 facts. Image
`397676c9dff2…` is published for the attended rollout. Repository gates,
real-DDL replay preservation and independent source audits passed; live
read-only preflight found zero holds. The corrected exporter reproduced all
209 current heads and 27,976 series points against the trusted baseline.

This qualification preceded the completed deployment described above.
The required result was eight new months with all 209 prior selections and
18,832 available series points preserved. [Qualification](evidence/mfin-history-20260925/pending8-qualification.json).

## September 25 historical batch deployed and audited

This earlier batch brought production to **209 selected months and 53,746 facts**. Job
`mfin-execution-monthly-historical-pdf-20260925-r1`, UID
`308688e3-0fb4-4185-83c9-303dcb795cfc`, completed with 154 new historical
months, 55 exact existing replays, zero errors and no pending acquisition.
The listing frontier remains July 2026 and its readiness check passed.

Independent audits matched all **5,639 new stored facts** and **27,976 national
series points** to original documents. All 5,540 previously available series
points remain exactly unchanged. Changes to older unavailable points are
accounted for by newly selected endpoints or predecessors. The 55 previous
releases, child rows and seals, plus all 1,884 prior raw interpretation rows,
are unchanged. Every corruption test was rejected.

Raw migration `20260924T090002` and production migration `20260924T090000`
are applied. The same monthly CronJob is active on image `62647597705f…`,
with unchanged schedule `0 4 5 * *` in `Europe/Bucharest`. Only its image and
suspend flag changed during reactivation, after the audits passed.

Versioned S3 objects **2748–2750** retain the full production snapshots,
209 BGC originals, independent audit methods and compact receipts, with exact
readback. Other report originals remain in the existing raw archive.
[Deployment and audits](evidence/mfin-history-20260924/historical-pdf-deployed.json),
[storage receipts](evidence/mfin-history-20260924/historical-pdf-storage.json), and
[migration/start receipts](evidence/mfin-history-20260924/historical-pdf-rollout-start.json).

At this stage, twelve held monthly periods and the 24 bulletin months of
2006–2007 remained pending. Eight of those held periods are now deployed, as
recorded above. Data.gov remains deferred.

## September 24 historical batch ready for attended rollout

Commit `8c8d63a9` qualifies 154 historical months and 5,639 national BGC facts.
The Zeus database suite passed 360 tests; independent original-source auditing
matched every fact and rejected four deliberately corrupted audit examples.
The image is published as `62647597705f…`, with its manifest and decoder hashes
verified. Production read-only preflight checked all 154 months with zero holds.

No historical financial migration or load has run yet. The live schedule and
its `8307970b…` image remain unchanged, with 55 selected months. A fresh baseline
retains all 55 selections and 11,388 national-series points. The same supervised
Opus session is preparing the attended migration and independent production
audit packet before primary execution. Twelve held months and the 2006–2007
bulletins remain pending; data.gov is deferred.
[Preparation evidence](evidence/mfin-history-20260924/historical-pdf-rollout-preparation.json).

## September 24 raw document persistence deployed

Commit `38119e55` and raw migration `20260924T090001` are deployed. The raw
archive database now contains **137 native Word interpretations**: 128 DOC and
nine DOCX originals, totaling 42,260,568 source bytes. All 137 were independently
audited after loading: 17,667 DOC text segments, 768 exact decoder artifacts,
223 DOCX XML parts and 69,549 nodes match the source evidence. Twenty-two
intentional audit mutations were rejected. There were zero conflicts or replays.

All **1,747 previous raw interpretation rows**, all 55 selected production
releases and their complete financial tables are unchanged. The CronJob UID
and entire specification are unchanged. This is raw lexical capture; it does
not publish additional historical financial releases or claim full 2006–2023
normalization. Data.gov remains deferred.

The implementation passed all 35 actual-DDL PostgreSQL tests on Zeus, including
137 original-output round trips and unchanged snapshots of all four older parse
kinds. `pnpm check`, full unit/contract/operations suites, Astra review and
Opus 5.5 high review passed. Fable high confirmed the family-free lexical design.
Family labels belong to source listings and later semantic interpretation.

S3 **2689–2690** retain the complete database-output snapshot, methods and
qualification, with exact versioned readback. All originals are already retained
individually and in objects 2683–2685; the full plan pins every source URL,
original hash and S3 version. Git contains compact receipts and text-only code;
new MFin spreadsheet fixtures are ignored.
[Code qualification](evidence/mfin-history-20260924/document-raw-validation.json),
[post-load audit](evidence/mfin-history-20260924/document-raw-deployed.json), and
[storage receipts](evidence/mfin-history-20260924/document-raw-storage.json).

## September 24 historical Word qualification

Commit `7ca1736f` adds the historical DOC/DOCX readers. All **137 available
Word originals** pass independent audits and an isolated Linux container replay.
The readers preserve source structure or exact decoder bytes; they do not yet
publish historical financial releases. Raw document-kind persistence is deployed
as described above; the historical financial loader remains open before data.gov.

S3 objects **2683–2685** retain all 42,260,568 original bytes in bounded archives;
**2686** retains complete Mac/Linux outputs and independent audits; **2687**
retains methods, source hashes, review and test evidence; **2688** retains the
compact qualification. All six immutable-version readbacks matched exactly.
Git contains only code, tests and compact metadata, with no new source binaries.
[Qualification](evidence/mfin-history-20260924/word-native-validation.json) and
[storage receipts](evidence/mfin-history-20260924/word-native-storage.json).

Verification: 229 source-enabled checks; 152 related PostgreSQL tests on Zeus
(six external-fixture skips); 396 passing commit-hook tests. Every repository
check stage passed; registry access required retrying the dependency stage
outside the network sandbox. Five full-suite timeout cases passed with one
worker and unchanged time limits. Astra and Opus 5.5 high reviews passed.
The disposable PostgreSQL instance and unused tunnel were removed afterward.
No financial load, production schema change or CronJob modification ran in this
qualification. The live release baseline below is unchanged by this work.

## September 24 qualified deployment

The monthly Kubernetes CronJob is active on the audited image, scheduled for
**the 5th at 04:00 Europe/Bucharest**. It archives source documents before
interpreting them and loads production only through the validated release path.
The next scheduled run is October 5, 2026.

Production now has **55 selected monthly releases, 48,107 numeric facts,
165 BGC/Sinteza/Nota inputs and 573 Nota pages**, through **July 2026**.
The September 24 run loaded exactly 13 new months and replayed all 42 existing
selections unchanged, with zero operational errors, zero pending acquisition
and forward readiness through July. This is not complete historical coverage.

| Year | Selected months |
|---|---|
| 2019 | June, December |
| 2020 | January, April, December |
| 2021 | February–May, August–December |
| 2022 | January, March, July–August, November–December |
| 2023 | January, April, July–October |
| 2024 | February–December |
| 2025 | January–April, June–December |
| 2026 | January–July |

## Original-source verification

The 13-month extension added **11,213 facts and 142 Nota pages**. An independent
native-file audit matched every new financial value, unit and BGC reporting
coverage against production. All prior 42 release and selection identities are
unchanged. Source formula-bookkeeping warnings remain recorded; no values were
repaired to remove them. Original Nota images remain archived with explicit
untranscribed-image findings; no OCR completeness is claimed.

The national series contains **52 budget items** with month, quarter, YTD and
full-year views. All **11,388 value/status points** were independently checked
against all 55 original BGC documents with zero mismatches. There are **5,540
available points**, including **1,174 newly available**; all 4,366 previously
available point objects remain exactly unchanged. Other points retain explicit
missingness or definition-change reasons. Monthly and quarterly changes require
compatible cumulative endpoints; missing inputs never become zero. A full-year
value means reported December YTD, not an assertion of final accounts.

These are database views. New API/client charts are a separate serving milestone.
Files from 1,549 document links have successful archived captures in versioned
S3. Five reviewed source links return HTTP 404; their failure evidence is retained
and they are retried. They are not counted as captured originals.

## Deployment and durable evidence

Implementation commit `ca025861` ran in Job
`mfin-execution-monthly-bookkeeping-20260924-r1`, UID
`e8144d21-18c1-4d1d-8e05-f2103ad18b33`, from 08:25:50 to **09:19:51 UTC** on
September 24. The successful pod's owner UID, exit zero and actual image digest
were verified. The tested image is
`sha256:8307970bfc4602c41e9b116d8183eac5f3e1bfac5e071b22c4ce47f6557e8b88`.

After independent production audits, Astra review and exact S3 readback, the
same image was activated on CronJob UID
`964a8206-c833-4232-92c9-1c7ef3356a2c`. The atomic UID/resourceVersion-guarded
patch changed only image and suspend; schedule, timezone and all other spec
fields are unchanged. The temporary qualification heartbeat is paused after
this outcome. Monthly extraction remains the Kubernetes CronJob.

S3 object **2647** retains the complete run summary. Objects **2648, 2649, 2590,
2651–2654** retain complete source/snapshot archives, audits and reproduction
methods. All seven audit artifacts were read back by their immutable versions
and matched their recorded SHA and size. The fact-audit report reuses object
2590 because production and throwaway-database fact snapshots have identical
content. Full snapshots remain outside Git; committed evidence is compact.

[Qualification](evidence/mfin-history-20260924/bookkeeping-monthly-qualification.json)
· [Fact audit](evidence/mfin-history-20260924/bookkeeping-production-fact-audit.json)
· [Series audit](evidence/mfin-history-20260924/bookkeeping-production-series-audit.json)
· [S3 receipts](evidence/mfin-history-20260924/bookkeeping-production-audit-storage.json)
· [Readback](evidence/mfin-history-20260924/bookkeeping-storage-readback.json)
· [Schedule verification](evidence/mfin-history-20260924/bookkeeping-schedule-reactivation.json)

## Historical bulletin capture deployed

The raw provenance migration and **23 index-selected BGC PDFs from the
2006–2007 bulletin ZIPs** are deployed. S3 objects **2656–2678** hold the PDFs
(2,480,736 bytes), with exact outer ZIP/version, full inventory and original
index lineage. An independent Python ZIP/HTML audit matched all 260 members
and 192 source anchors. This does not add financial releases to production.

The capture code is committed as `1cd1b47c`, with native-anchor correction
`df67915d`. HTML5 repair had duplicated empty links in malformed indexes;
that was corrected and independently verified before any member capture.
Opus/Astra review, 66 real-DDL tests, 64 source-enabled tests, the full unit
suite and all required repository checks passed.

All 55 selected release records and the full existing input/fact/page rows
remain unchanged, as does the 2,351-entry monthly original scan. The CronJob's
complete specification is unchanged and remains active. Complete snapshots,
methods and audit reports are in S3 **2679–2682**; each passed exact-version
readback. No source binaries or bulk extracts entered Git.

[Deployment validation](evidence/mfin-history-20260924/bulletin-native-validation.json)
· [Independent native audit](evidence/mfin-history-20260924/bulletin-native-independent-audit.json)
· [S3 receipts](evidence/mfin-history-20260924/bulletin-native-storage.json).

## What remains

Complete **2006–2023 national-budget coverage before data.gov** (user decision).
Older PDF/ZIP financial tables, Word Nota and remaining XLS profiles are under
active implementation and review; their prototypes are not production releases.
The historical financial-schema extension remains unapplied. Existing 52 item identities and
selected releases retain their current policies and source precedence.

January 2024 is held for a missing BGC original; May 2025 is held for incompatible
estimate/period evidence. Historical source gaps and conflicting claims stay
explicit. July 2006's detailed BGC says July 30 while a companion says July 31;
no date is silently overwritten.

[Historical implementation and remaining work](MFIN_HISTORICAL_IMPLEMENTATION_2026-09-24.md).
No new XLS/PDF/ZIP or bulk decoder fixtures enter Git (user decision).
