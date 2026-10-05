# Ministry execution decisions

- Extend the existing approved-budget lane to the same five forms across
  available annual packages (user decision, 2026-09-26). Keep the source budget
  edition in `budget_year` and each amount's target year in `measure_year`.
  Forecasts for the same target year from different editions remain separate;
  do not overwrite earlier predictions. Preserve source publication versions
  and record exact publication dates only when supported by official evidence,
  independently of catalog upload or capture time. Reuse the existing tables
  with narrowly reviewed changes; preserve the audited 2025 release and BGC
  monthly lane. This supersedes the earlier deferral of other budget years,
  while investment/program annexes and plan-versus-execution remain deferred.
- Introduce 2024 as the first additional edition after primary and Astra source
  review. Keep existing 2025 config hashes, interpretation IDs and stored rows
  unchanged. The edition-based loader uses one atomic five-form publication and
  rejects conflicts within the same budget year, source publication and form.
  Preserve distinct forecasts for the same target year across editions. No new
  publication-date table is needed for this increment.
- For 2024 synthesis PDFs without usable text, retain the original PDF and
  reviewed page image as the unit witness. Primary and Astra checked the year
  headers, units and reference amounts visually. OCR is auxiliary transcription;
  never correct OCR silently using the XML. Preserve the separate render settings.
- Disposable baseline comparisons may omit test-specific archive/run fields.
  Production preservation must compare every existing 2025 raw and prod field,
  including source publication, archive versions, IDs and stored timestamps;
  compare legacy registrations and BGC separately. The fixture comparison alone
  cannot qualify a live rollout.
- A frozen verifier that refuses because an unrelated later migration changed
  the global ledger stays refused (2024 retention, 2026-09-28, primary
  decision). Record the extra entry, never loosen or patch the frozen check, and
  prove data equality separately with the frozen packet's exact SELECTs before
  closure. Retention archives the reviewed evidence; it is not a fresh
  correctness proof.
- On the transfer path used for the 2024 rollout (`kubectl cp`, and single
  `kubectl exec` stdout/stdin streams to Chronos with
  `KUBECTL_REMOTE_COMMAND_WEBSOCKETS=false`), files above about 8.8 MB were
  silently truncated. This was observed on that path, not established as a
  general kubectl limit. Move large files in 4 MiB chunks, each hash-checked,
  and require the whole-file SHA to match before using any restored or
  retrieved evidence. During the 2021–2022 rollout, the same exec path also
  returned intermittently corrupted 4 MiB and 1 MiB chunks. Compare every chunk
  with its pod-side SHA and retry; never accept a chunk on size alone.
- Load several annual editions in one bounded Job only when it captures and
  verifies every edition's forms before publishing any (2021–2022 rollout,
  primary and Astra decision). Each edition then publishes in its own
  transaction; never claim a cross-edition commit. A hold or failure stops the
  Job, and the verifier reports and refuses the exact partial state. Never
  retry, replay, recover or remove rows automatically: the primary decides.

- Finish verification, deployment and production auditing of the already-parsed
  January 2006–December 2007 BGC batch, then move on to data.gov.ro (user decision,
  2026-09-25). Do not expand this milestone into further difficult historical
  parser work. Keep December 2008, September 2012 and November 2012 archived but
  unpublished, with explicit gaps and reasons. July 2019 remains a source gap;
  do not infer its national figures from arrears or adjacent months. These
  exceptions do not block the transition to data.gov after the bulletin rollout.
- The 2006–2007 bulletin contract keeps only the source-backed BGC table as a
  financial input. Possible Sinteza/Nota members remain `family_unresolved`,
  with their complete packet inventory, evidence and conflicts sealed for later
  review. February's unit and April's period use narrowly pinned source witnesses;
  their missing native claims stay null. July's printed July 30 coverage must not
  be silently extended to July 31 for monthly comparisons.
- Archive every execution-page attachment; first publish monthly BGC, Sinteza and
  Nota together (user decision).
- Keep national item evolution at month, quarter, YTD and full-year grain, with
  explicit missing periods and source operands (user decision).
- Use one monthly Kubernetes CronJob for now. Defer the longer-term extraction
  mechanism; run validated production loading after extraction (user decision).
- Initial monthly schedule: day 5, 04:00 Europe/Bucharest. Source checks are
  unconditional, with content hashes avoiding duplicate capture. One worker,
  1-second spacing, 2,500 claims, 10,000 retained-original ceiling, six-hour job
  deadline, one Kubernetes retry, no overlapping runs. These are operational
  bounds, not proof of source completeness.
- New months require all source acquisitions accounted for under the explicit
  unavailable-original policy below, and one distinct supported
  BGC/Sinteza/Nota set established by document contents. Conflicting revisions
  remain archived and held for review; acquisition time does not choose truth.
  Unchanged selected releases reuse their original IDs and receive a replay audit.
- Monthly runs never migrate schemas, delete data, modify the national item
  catalog or change source precedence. Requests and run summaries are retained in
  the existing versioned archive before/after publication.
- Data.gov.ro approved-budget work starts with the 2025 state-budget synthesis
  and detailed allocations, plus social-insurance, health and unemployment
  syntheses (user decision, 2026-09-25). The user authorized implementation,
  deployment and extraction, with Opus implementing and primary review and live
  supervision. This supersedes the earlier entity-list-first recommendation.
  Keep approved budgets and forecasts distinct from execution. Other years,
  investment/program details and component-level plan-versus-actual comparisons
  are later steps; no further difficult execution-history parsing is required.
  Retain CKAN publication/revision identity and exact versioned originals; do not
  overwrite same-filename files or change the existing BGC monthly publication.
- Finish the national-budget data before expanding into entities or the broader
  data.gov.ro catalog (user decision, 2026-09-22). Local catalog drafts are held
  outside active source and migration paths; no catalog deployment has run.
- The first approved-budget release uses two additive tables: raw ordered
  interpretations and production numeric observations. Preserve the existing
  five-file registrations and legacy raw/prod rows. Require all five reviewed
  forms together; do not silently publish a subset or combine source revisions.
- Keep printed totals, subtotals and details as separate observations. Preserve
  commitment credits versus budget credits and each credit row's descriptor.
  `PROGRAM_2025` is the approved plan; `ESTIMARI2026`–`ESTIMARI2028` are forecasts.
  Blanks are not zero, source authority codes are not CUIs, and code 999 denotes
  the national revenue section rather than another authority. Do not sum across
  hierarchy levels or connect these rows to the legacy execution comparison.
- For these five forms, thousand-lei units are external assertions bound to the
  archived law PDFs and authority-annex ZIP, not native XML fields. Retain the
  cuprins document for the as-sent publication vintage. A changed source is
  archived and held for review; capture time does not establish a new approval.
- Deploy this first slice through one attended capture-and-load Job, separate
  from the existing BGC monthly CronJob. Apply only the two reviewed migrations;
  preserve all existing data. Audit the actual production amounts, source
  versions and identities independently, and retain the complete audit inputs
  and results with versioned readback before declaring the release complete.
- Any one-shot Job that reaches the production Postgres needs
  `app.kubernetes.io/part-of: transparenta-eu-etl` on its **pod template**. The
  ingress policy selects pods, not Jobs, and must not be widened for a release
  (2026-09-25, approved-budget r1). For a connection timeout, inspect the pod labels and matching policy before
  diagnosing the cause. Prove there was no capture before a reviewed label-only
  retry.
- Account separately for captured originals, explicitly reviewed unavailable
  originals, and unresolved acquisition. Five exact historical HTTP 404 URLs have
  retained error bytes and current listing evidence. Missing monthly inputs hold
  August 2010 and January 2024; three arrears files do not define monthly releases.
  Verify the latest attempt and error bytes each run; retry these reviewed URLs
  after seven days through the audited queue API. A timeout is never absence.
- Forward readiness uses the current listing's announced month and the preceding
  twelve calendar months, as specified by the initial-release plan. English-only
  or archive announcements can advance expectations but cannot satisfy Romanian
  report families. Every announced month in that window requires all three
  families and a successful load/replay. Source gaps, old unsupported reports and
  historical publication holds remain separately visible. Loader, custody and
  existing-release audit failures remain fatal.
- Listing parser v2 preserves the observed empty href-less quarterly placeholder
  as navigation with its missing-href evidence. Only its exact empty class/target
  shape is exempt; labels, handlers, child elements, empty href values and panels
  without document candidates still require review. Original v1 interpretations
  remain immutable; no migration or evidence rewrite is involved.

- Co-design national-budget schema and fixes in one resumable Claude Fable high
  session (user decision, corrected scope 2026-09-22). Session
  `723fa864-6840-4c2b-af93-a2898b96f9ce`, explicit `claude-fable-5` / high, is
  retained locally and has been resumed with the same ID. Astra independently
  reviews correctness-critical changes. No procurement scope is included.
- Keep the existing release/observation/item/view design. The independent source
  audit covers all 30 releases through July 2026, 52 items and 11,388 points.
  Add complete deployed-catalog equality and pre-join endpoint coverage guards;
  do not revise facts, release IDs, immutable receipts or admission policy.
  New releases record the ninth structural check; existing releases gain current
  replay/run evidence without rewriting their historical gate artifacts.
- Catalog additions require explicit versioned review. Unknown BGC national
  labels and duplicate endpoints (including blank cells) block publication.
  Legitimately absent items remain missing, never invented as zero.
- Keep strict finality compatibility in the frozen v1 series. Full-year means
  December YTD coverage, not necessarily final accounts. May 2025 remains held
  for estimate/mixed-period evidence. Estimate-only current reports require
  review and cannot silently become actual expenditure.
- The full independent XML/Decimal oracle is an attended deployment/parser/
  catalog-change audit. The monthly job uses original replay and small recurring
  catalog/endpoint/output checks, with versioned evidence in its existing receipt;
  no additional service, table or scheduler is introduced.

- A rejected or unresolved production promotion fails the source loader. The
  generic promote wrapper returns failure as a value; the source boundary must
  check it before the coordinator counts success. Preserve run/release/selection
  IDs and commit-resolution diagnostics; an unknown commit is not proof of
  rollback, and recovery reuses the exact deterministic request.

- Complete historical national-budget coverage before data.gov.ro, keeping the
  implementation simple and clean (user decision, 2026-09-22). Use separate
  BIFF source representations; do not convert legacy XLS into apparent original
  XML tokens or implement an Excel recalculation engine.
- Prefer December 2019 for the first historical release. Its BGC and Sinteza
  workbooks have no cached error cells and local arithmetic/shared formulas;
  narrow annex-caption presentation differences are independently documented.
  December 2020 remains a subsequent candidate because its BGC also needs
  explicit partial-year Eximbank accounting/metadata dispositions.
- BIFF evidence retains encoded bytes and an exact encoded decimal separately
  from a conventional decoder rendering. Across nine sampled files, 63 RK
  encodings differ from binary64 division after scaling. Any admitted values
  require an explicit versioned policy; published precision and stored encoding
  remain distinct. The current XML policy and selected releases stay unchanged.

### Historical bulletin custody

The monthly bulletin's original HTML index identifies the inner BGC PDF. Retain
that PDF with an `archive_member` object role and an append-only origin linking
the outer object/version/hash, full native ZIP inventory and exact index anchor.
The outer ZIP remains the human-openable source URL. The dedicated role keeps
members out of the existing monthly document scan, where the same URL with a
different hash would otherwise appear to be a source revision. This proves
package provenance, not reporting period or financial admission; historical
admission must independently replay the outer bytes and index.

### Historical financial design boundary (not yet deployed)

Independent Astra and persistent Fable co-design retain immutable inputs,
observations and facts plus a sealed root family contract. Source completeness
and normalization completeness remain distinct; the 55 selected releases and
both faithful-BIFF policies keep their existing behavior.

Required monetary equations need independently proven units and compatible
coverage in RON. Token arithmetic is diagnostic, never missing-unit evidence
or a substitute passing gate. February 2015's missing Sinteza current unit
remains held. February 2013's ambiguous prior leap endpoint and May 2014's
contradictory Nota date need explicit reviewed rules/evidence; a JSON flag alone
cannot authorize contradictory period claims. July 2006 keeps its July-30
fiscal/report endpoint separately from the July calendar bucket, with no full
July or August subtraction using that partial endpoint.

A distinct historical native-cache policy is supported in principle for
explicitly enumerated external-workbook formula bindings. Its claim is the exact
saved cache in the distributed original, without recalculation, rendered-display
or dependency-completeness claims. Eligibility is source-pinned, never a generic
fallback after strict admission fails. Preserve cache type/bytes, formula bytes,
reference bindings and whole-workbook incomplete-dependency findings. Error or
blank caches never become zero. Unit/period/identity, styles, physical inventory,
required accounting and residue proofs remain independent requirements. Program
columns are not actual execution and still need their own reviewed dispositions.
This policy remains unimplemented/unqualified, not authorization to publish a
failed workbook under another name.

Word text stays inline in input observations. Family labels stay in listing
evidence and semantic interpretation; lexical decoder identity is family-free.
Raw document capture reuses the existing immutable parse table with explicit
format, decoder configuration and source version. DOC spans identify exact native
decoder artifacts; DOCX locators include actual part path and part-local block
ordinal, preserving multiple headers/footers. Empty blocks and unsupported
visual/text-bearing parts remain explicit. Older bulletin summary tables and
Nota-like HTML need content-based family review; missing modern labels alone
do not prove the family absent.

### BIFF admission and December 2019 canary

The original binary value has an explicit interpretation:
`biff-exact-encoded-decimal-v1`. NUMBER/FORMULA values use the exact finite
binary64 value; RK preserves its encoded integer/binary64 value and exact
optional division by 100. Conventional decoder rounding is retained separately.
The BIFF lexical interface uses the existing raw decimal parent-binding field
under its own parser version, with original bytes and encoding provenance. It
never calls generated decimals authored XML text. No schema migration is needed.

`execution-biff-workbook-v1`, family-specific BIFF semantic versions, and
`faithful-biff-encoded-observations-v1` remain distinct from the frozen OOXML
identities. Loader policy comes from pinned immutable lexical parents. Existing
XML interpretation/output identities are unchanged. Full-record inventory,
physical cells, labels, units, formats and native local formula references have
independent stdlib Python audits. No recalculation or Excel rendering claim.

December 2019's 514 BGC and 326 Sinteza facts pass the existing exact accounting
and source-disposition rules. Two Sinteza balance percentages remain unresolved;
K55 remains a nonfinancial cached zero with explicit blank operands, adjacent
source labels and zero native point/range consumers. Nota retains all 13 native
pages and source images without claiming transcription. The real-DDL Zeus test
loads and replays the complete set under its separate policy.

Astra reviewed the closed record vocabulary and six extension payloads. Theme,
protection, compatibility, workbook/sheet settings and built-in table-style
metadata are bound by type/location/length/payload digest. New extensions fail
admission. NAME/SupBook/XCT/CRN remain opaque only after every native cell formula
is proven local, excluding name/external tokens. XFExt/StyleExt property sizes
and IDs are checked; numeric-format override properties are not accepted.
Both originals contain 41 STYLE/StyleExt built-in flag disagreements, and their
XFExt font-scheme field uses one byte instead of the specification's two.
These source discrepancies are retained as quality findings; all associated
properties are proven nonnumeric and cannot change the stored cell format.
They are not represented as specification-conforming source records.

The independent historical scan covers all 209 locally retained monthly XLS
originals. Sixteen workbooks pass this narrow profile; only December 2019 has a
complete XLS pair. Remaining reasons are retained in
[evidence](evidence/mfin-monthly-20260922/historical-biff-qualification.json).
This is a backlog inventory, not completion of national-budget history.
Monthly XLS qualification holds only typed, expected profile refusals; custody,
monetary invariant and unexpected code failures remain errors. A differing XLS
alternative conservatively holds an existing XML month; its selected release
still receives the unconditional original replay audit. No automatic revision
precedence was added.

December 2019 production canary completed under release
`c3f30e93-893a-55a0-aa9a-58dc5252532a`, selection
`3aaec171-13d3-5269-a768-c41dc1e9613b`. Raw XLS parses are 1871–1874;
Nota reuses 245–246. Independent native-Fraction audit matches all 840 facts;
combined original-XML/BIFF audit matches 11,388 series points over 31 originals
and 1,526 located endpoints. All 30 prior release/selection IDs are unchanged.
A durable all-selected replay finished successfully at 13:43:01 UTC.

The first client stream closed while emitting the large post-commit result.
The exact release/selection/ledger was queried before retrying: succeeded,
840 facts. One overlapping manual replay hit its 30-second lock timeout; the
subsequent serial all-selected replay proves every release, including the canary.
No additional release was created. The attended script now emits bounded receipt
fields. Audit snapshot, fact snapshot and reports are in versioned S3 objects
2490–2494; [receipts](evidence/mfin-monthly-20260922/dec2019-audit-s3-receipts.json).

Monthly qualification also recognizes unsupported accounting profiles before
planning either XLS or XLSX loads. The actual December 2020 BGC has a separately
dated Exim component: reading its Sinteza XLS must not accidentally turn that
known hold into a recurring load error. Financial/custody failures still fail;
unknown/current unsupported profiles cannot satisfy forward readiness.

### December 2020 dated-component admission

Astra inspected the original BGC XLSX: its 47 national endpoints keep report-period
coverage and map to the existing catalog. The reviewed implementation retains
M15/M16 as dated Exim metadata and admit the existing N68 blank-row sum residue,
then validates the Exim balance on its own declared interval and the source's
same-row component consolidation. Other operands keep report-period constraints.
No schema/catalog redesign is needed for this cohort; no new production write is
started while the current monthly qualification Job runs.

February/March 2019 remains a later cohort. Astra and the retained Fable high
session found two historical tax wordings with unproven cross-year equivalence.
A small additive catalog-v2 union and versioned series views can preserve the
52 existing identities and expose two historical published-item identities, with
`equivalence_unverified` instead of inventing a scope change or subtracting across
identities. This design is recorded for later implementation; v1 stays unchanged.

The same Claude Fable high session approved the concrete implementation (turn 14).
The existing date converter and raw parser outputs are unchanged. Exactly three
metadata diagnostics are retained in raw and discharged by a recorded source-bound
rule. Actual-DDL tests load/replay 856 facts (531 BGC, 325 Sinteza); an independent
XML/BIFF Fraction oracle checks every value, unit and BGC date range, including
15 Exim facts. Negative controls reject token, value, unit and coverage corruption.

Monthly interpretation skips URLs absent from the current monthly-report panel.
Every listed kind remains eligible for interpretation so contradictory titles still
block publication. All-original acquisition and revision detection remain unchanged;
unlisted selected releases still receive the unconditional guarded replay. This
avoids parsing archive-only arrears as budget reports without expanding automation.

December 2020 is now selected as release `0983b804-2b23-511a-abcb-3fff97385b16`
and selection `52891e64-0eb6-5bdc-a901-b6c0ae6cb8a8`. The post-load independent
oracle matched every fact and all 11,388 national series points; the previous
31 selected identities are unchanged. Versioned S3 objects 2499–2503 retain the
32 original files/snapshot, complete new facts and audit receipts. Original Nota
image content remains archived with explicit untranscribed-image findings.

### Reviewed 2020–2022 historical cohort

January 2020 and nine 2021–2022 months share the existing item catalog and fact
schema. Six source-reviewed SheetExt payloads differ only in tab colors; the
closed record grammar, scope/length checks, style and native formula audits remain.
The [Microsoft SheetExt definition](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-xls/780be342-6fd0-4265-aaeb-a51f422a9c08)
and an independent byte decoder corroborate those fields.

A separate native BGC rule retains a cached zero on the blank row before balance
as nonfinancial only with literal recovery/balance neighbors, explicit blank B:M,
otherwise blank row, visible source, approved format, exact native SUM(C:M)
expression/range and no consumers. Dormant names remain captured; the native
closed formula grammar proves that no cell formula invokes them. Secondary name
range parsing is not claimed. Existing Sinteza rules stay unchanged.

Source inconsistencies in shared-formula flags/counts remain held. Unclassified
historical helpers also remain held, but only after classified values pass the
same exact conversion/unit checks as ordinary admission; malformed values,
unresolved-share misuse and nonnumeric/ambiguous financial slots remain fatal.
Astra and the same Fable high session (turns 15–16) reviewed the design and code.

The [fixture manifest](../tests/fixtures/budget-official/historical-2020-2022.json)
records all 30 original URLs/hashes and expected counts. The April 2021 Nota has a
misleading legacy folder date; publication uses its actual document header and
opening text, which agree on April 30. Ten source PDFs retain 106 complete native
pages and explicit untranscribed-image findings; no OCR completeness is claimed.

The ten reviewed periods are now published. Job
`mfin-execution-monthly-historical-ten-20260922-r3` completed September 22 at
18:08:28 UTC with ten new selections, 32 unchanged replays and no errors or
pending acquisition. Production has 42 selected months, 36,894 facts, 126 inputs
and 431 Nota pages. Independent post-load audits match all 8,529 new facts and
all 11,388 national-series points. Versioned S3 objects 2581–2586 retain full
snapshots and audit evidence; object 2580 retains the run summary. The prior
32 selected identities are unchanged. After independent evidence review and
Chronos identity checks, the existing monthly CronJob was reactivated on the
qualified image; schedule, schema and catalog stay unchanged. Older historical
profiles and data.gov remain deferred.


### Full historical period, September 24

Complete 2006–2023 before data.gov (user decision). Use Sol 6 xhigh subagents
for bounded parser investigations/prototypes, primary code review, Opus 5.5 high
for code-quality improvements, then primary final review and tests; iterate
before deployment (user decision). Experimental originals/prototypes are allowed
to speed development (user decision). The requested Opus model was verified by
Claude CLI response metadata as `claude-opus-5-5`; no fallback was configured.
The existing immutable custody and source-value semantics still apply. Early
family absence must be represented explicitly, not fabricated into modern
three-family completeness. Production currently retains the qualified 42-month
baseline while this historical extension is developed.

Do not commit XLS originals; keep Git clean and lean (user decision, September
24). New original documents and bulky decoder fixtures stay in versioned S3
and the ignored experimental cache. Commit code, compact hash/URL manifests
and audit summaries only. Real-source qualification tests use the explicit
`MFIN_HISTORICAL_FIXTURE_ROOT` cache; ordinary tests do not fetch live documents.

### Historical current-BGC PDF policy (implemented, not deployed)

Historical months use the explicit `historical-bgc-current-v1` policy with the
frozen profile `historical-bgc-pdf-national-current-v2` (interpretation
`execution-historical-bgc-pdf-table-v1`). Facts come only from the BGC PDF's
national (general consolidated) current amount column, and only where the
complete native label equals a frozen catalog-v1 label (the balance label may
omit its spaces). Revenue − expenditure − balance must be compatible at printed
precision; every printed step is retained. Estimates stay `estimate`.

Every numeric table row has a national slot: a printed amount (fact, or
`retained_only` outside the catalog), a source **blank** (never zero; catalog
blanks carry the series classification, so the series reports
`blank_endpoint_value`, not an absent item), or `unresolved` with a reason
(unparsed token, duplicate identity, a value line with no native label). Every
other printed value of the table is a `retained_only` observation per native
word, with no column identity or unit claimed; blank component slots are not
enumerated. A value word above the first table row is an explicit `unresolved`
`unplaced:` observation. Every remaining digit-bearing word has a context reason
(header, footer, label text, after the table); admission recounts all digit
words from the pages and requires exactly one owner or reason for each.

Each retained companion gets a performed comparability assessment
(`historical-companion-assessment-v1`), bound to its native evidence: Sinteza
report period, million-lei unit and the three national headlines at printed
precision (PDF or workbook); Nota report period only (narrative amounts are
deferred, not read). Headlines are compared only when every scoped period
claim agrees, the heading states realized execution (`Realizari`) and the BGC
itself is actual; estimates, conflicting period claims, a qualified balance
(e.g. "fara influente top-up"), a label owned by more than one row, a detached
sign or several words in the current column are recorded as not comparable.
Results are `consistent`, `disagreement` or `unproved`; a companion never
supplies a date, unit or value, and disagreement is recorded, not blocking.
Absent families are recorded with their listing locator.

Family absence requires the re-read, hash-verified and re-parsed listing
capture: every monthly-panel anchor naming the month (any classification) is
dispositioned — other family, Nota language edition, or a reviewed other
publication (public-investment tables, health-fund budget). An unclassified
anchor is excluded from a month only when its own title/URL names another year
or only other months; a yearless or monthless anchor stays a candidate.
Anything unresolved holds the month as `possible_companion_unresolved`; an
English Nota edition alone never proves the Romanian Nota absent.

Months are selected by a reviewed cohort manifest pinning family presence,
original URL/SHA, the exact fact digest and the complete BGC disposition digest;
it is never a fallback after a failed whole-release admission, and existing
selections are never replaced. Where no header states the report kind,
execution status is `actual` from the listing context, and that basis is
recorded. Cancellation is honoured after planning and before promotion.
2006–2007 bulletin months stay deferred until their ZIP family contract is
reviewed by content.

### Eight-month historical extension (qualified, not deployed)

The separate `historical-bgc-pdf-national-current-v3` profile qualifies January–
April 2009, June 2015, and May/June/August 2016: 287 additional facts. The old
154-month interpreter, profile and cohort remain frozen for exact replay.
Derived crop geometry is recorded separately from native lexical geometry;
new raw `090003` and production `090001` guards recompute its bounds. Printed
blank national rows remain blank, including the June financial-operations row
and the 2016 donations/loans rows; they never become numeric zeroes.

April 2009's erroneous listing date is resolved only for its exact title/URL,
pinned original and native period. Capture hashes and anchor ordinals remain
provenance rather than eligibility, so authentic listing refreshes still work.
The read-only production audit requires an externally trusted pre-load snapshot
hash and binds every new original and release to the reviewed cohort.
[Qualification](evidence/mfin-history-20260925/pending8-qualification.json).
The eight-month load and remaining bulletin formats are separate milestones.

## 2026-09-28 — Prioritize machine-readable data (user decision)

Focus the remaining annual-budget work on XML, CSV, JSON, APIs and straightforward
structured spreadsheets. Defer PDF-only sources, scans, OCR and difficult legacy
formats. Do not spend further effort decoding unclear PDF digits.

The 2021–2022 cohort extracts XML; its supporting unit witnesses are already
reviewed. Complete the existing checks and the reviewed XML loading workflow.
For later cohorts, record unresolved meaning or unit evidence and move on when
resolving it would require more PDF investigation. Preserve existing admission
and production-audit checks; unread or deferred periods are not complete.

## 2026-09-28 — Approved budgets back to 2015 (user decision)

Aim to complete approved-budget coverage back to 2015, still machine-readable
first. That means XML, CSV, JSON, APIs and straightforward spreadsheets, with
no new PDF or OCR investigation.

The next cohort is the missing 2023 and 2020–2015 editions. Reuse the retained
source research:
- prefer current-grammar XML years, then small adaptations for older XML
  dialects;
- require machine-readable evidence of units and publication/version identity;
  never assume a unit or substitute a different missing form;
- treat 2015's missing state-budget synthesis as an explicit gap to
  investigate, not as five available forms.

Keep `budget_year` and `measure_year` separate, and approved separate from
forecast. Preserve existing edition identities and the active BGC lane. Add no
new table unless a demonstrated requirement earns it.

Report available, parseable, qualified and loaded counts separately. The target
alone admits no year to production: primary and Astra review the actual
evidence first. The 2021–2022 release was finished first.

## 2026-09-28 — Raw custody before financial qualification (primary and Astra decision)

For the 2023 and 2020–2015 approved-budget editions, custody of the raw sources
comes before, and separately from, financial qualification:

- Reuse durable legacy S3 objects by versioned readback. Never re-download them,
  and never relabel research bytes as HTTP responses.
- When duplicate legacy registrations exist, keep both; never pick a canonical
  identity during capture.
- Archive and read back every response before validating it, including error
  responses. Keep an HTTP 500 body as an attempt record, never as a document.
  A hold stops the run, with no retry.
- A passed postcheck on a held run proves custody and preservation, not that
  the plan completed. Retaining that held run is acceptable, and its receipts
  must carry the held outcome.
- Describe a missing source as not found in the inspected sources, not as
  proven never to exist.
- Accept a peer's ledger additions into a fresh preflight baseline only after
  review shows they touch no guarded state. Any later drift still stops the
  operation.

Raw custody admits no year to publication. Units, version identity, older XML
dialects and completeness stay open until primary and Astra review the actual
evidence.

## 2026-09-29 — Finish remaining editions in production (user decision)

Focus on the remaining approved-budget years, one at a time. Done means the
data is loaded and available in the production database, with the independent
production-output audit passed. Raw acquisition and research are intermediate
steps. The primary's order is 2023, 2020, 2019, 2018, 2017, 2016 and 2015.
Keep the machine-readable-first scope and existing monetary, edition and
preservation checks. Preserve unresolved source gaps explicitly; do not infer
missing values or units to claim completion. Claude continues implementation
and approved deployment steps; primary owns review and key decisions.

## 2026-09-29 — 2023 unit evidence from a specific annex and anchor

Primary and Astra approved implementation using the already-held print witnesses
for annex, units and 2023–2026 headings, supplemented by a uniquely identified
official HTML anchor for unread reference digits. Masks remain explicit; XML
supplies published values. Whole-table HTML comparisons are diagnostic, not a
requirement that the two publications agree. Conflicting HTML years and values
remain recorded; the portal's absence of recorded actions does not prove a
base-only version. Successful witness bytes and acquisition provenance must be
retained and independently audited before production admission. The four
released editions remain unchanged; this decision is not a completed load.

## 2026-09-29 — 2023 closure: held witnesses, full-row gates and transport

2023 is loaded, audited and retained (see the status note). Decisions and
lessons from its rollout, for the next cohorts:

- A held research witness enters custody only through an attended transfer
  of its exact pinned bytes with the ORIGINAL acquisition (URL, HTTP status,
  time, receipt line). Existing custody is inspected before any write;
  compatible custody is reused without a write, anything else refuses. It is
  never a fresh HTTP response, never retried, and a failed attempt at the
  same URL (object 2954) stays a separate record.
- The frozen verifier's token and preservation use the 11-column custody
  projection. Before each live write (transfer, Job, retention), a reviewed
  read-only guard compares every archive row in all 16 columns plus both
  ledgers; after it, the additions must be exactly the receipt-linked ones.
  Retention runs through a one-shot wrapper with a write-once attempt marker.
- Content addressing depends on encoding: the same catalog bytes stored with
  a content type (compressed key, object 2936) and without one (plain key,
  object 2960) are two objects. Account for such pairs explicitly; neither is
  a change to the other.
- `kubectl exec` streams can be truncated at 64 KiB multiples for 1–4 MiB
  reads. For bulk evidence, use `kubectl cp --retries` (resumes at the byte
  offset) and require the whole-file SHA against the pod-side list; never
  accept a file on size alone.

## 2026-09-29 — Held PDF pages for verification (user decision)

The user approved a narrow exception to the machine-readable-first scope:
inspect four annex pages in the two already-held 2020 law PDFs to verify
units, year headings and reference values. No new PDF downloads or OCR are
included. All loaded amounts still come from the XML. Unreadable or
conflicting evidence remains unresolved; primary visual review and the
independent audit are required before admission.
