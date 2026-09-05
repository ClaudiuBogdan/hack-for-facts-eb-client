# Native INS source selection and completeness

Status: design approved by Astra high and Fable high; implementation in progress. Native INS remains disabled until
this client migration and the server/data acceptance gates pass. These decisions
apply to the Chronos dev migration; they do not change Phoenix deployments.

## Rollout sequence

Build and test the client against the opt-in native server before enabling INS.
Chronos dev runs the redesign entrypoint, which currently exposes no INS module;
there is no supported legacy-INS/native-INS negotiation on this deployment.
After server bridge/data/workload gates pass, mount the native schema, then sync
the reviewed client image in the same dev rollout wave and verify every surface.
Do not deploy new client documents against a legacy INS schema. Phoenix is excluded.

## Contract and visible states

Carry the server's AMBIGUOUS_GEOGRAPHY strategy and two geographicWitnesses
through runtime validation and domain mapping. Dashboard groups also carry
SERIES/AMBIGUOUS_GEOGRAPHY and explicit truncated status. Validate complete ordered
integer coordinate pairs, distinct witnesses, and outcome consistency. Missing
required native fields are a response error, never a legacy fallback. Update test
fixtures to the new contract. Accept SEMESTRIAL, RANGE and OTHER metadata cadences
and the new match-strategy enum before parsing complete dataset pages.

An ambiguous tile or dashboard remains visible with the shared message
"Mai multe serii geografice corespund selecției" and an action to inspect source
rows. Suppress its automatic value, chart, sparkline, ranking and comparisons.
Witnesses are examples proving ambiguity, not all options. Use the existing
alert/tile components, design tokens and Lingui Romanian/English translations.
No new visual system or modal flow is needed.

Missing data, malformed response, ambiguity, incomplete history, unsupported
cadence and catalog-only data are different states. A null observation must not
be labelled as zero. Honor dashboard truncated directly, including histories far
smaller than the legacy guessed total budget. Preserve healthy sibling datasets.

## One source-series identity check

A small pure helper requires complete source metadata before determining whether
observations describe one selected source series. Omitted dimensions cannot compare
equal by accident. Identity is dataset + unit + all source classification dimensions in
canonical order; geography contains the complete ordered source pairs. Keep the
period separate so a different coordinate in a different year is still an
alternative source series. Equal values do not merge identities. Original opaque
observation IDs identify cells and are retained for pagination/export checks.

Default heroes and charts require one complete identity and one cell per cadence
and period. Local uniqueness does not remove historical/geographic qualifications.
No first-row or last-row winner, SUM or average may resolve source alternatives.
Tables and exports retain all original cells. The existing URL codec can store explicit coordinates, but geographic controls
must be added: reuse DetailDimensionCombobox for each declared geographic dimension,
labelled "Coordonate geografice din sursă", and preserve source labels/member IDs.
Store one D<dimIndex>:<nomItemId> per geographic dimension in clasificari.
"Folosește această serie" patches clasificari and unitate atomically from the inspected row, leaving teritoriu untouched.
No new modal or URL field is required. Never flatten two witnesses into lists
whose cross-product invents coordinates.

Explicit geographic pins mean URL entries, never classifications resolved by tier 0 defaults.
Any explicit geographic source pins disable the inferred national default when
no territory is explicitly selected. Retain explicit canonical territory filters
as intersections; never silently remove one to obtain results. Incomplete or
conflicting pins are visible invalid/incomplete selections, not broadened queries.
The user can clear the canonical territory to inspect qualified source coordinates.
When that retained territory excludes a qualified witness, the empty state explains the intersection and offers that clear action.
Do not discard malformed or duplicate dimension pins or invent DIM<index> aliases.
Unresolved-dimension checks include every declared geographic axis. Source-row
inspection remains available while an automatic single-series chart is blocked.

Use this helper for detail, territory series, comparisons, decade rankings and
saved INS chart series. Comparison data validates each selected territory's series
before deriving values. Ambiguous counties are explicitly accounted for and do
not silently produce a partial ranking. Saved SUM/average/first configurations
with multiple source identities return a visible unsupported/ambiguous result;
existing saved documents remain readable and editable. An explicit union of
classification members is not automatically additive: TOTAL plus a component,
percentages and alternative definitions can overlap. Without a reviewed source
additivity contract, do not restore multi-identity SUM/average through a heuristic.
This is a visible limitation, not deletion or reinterpretation of saved requests.

Remove unused raw county/UAT dashboard adapters after confirming they have no
callers. Any remaining raw-observation adapter must keep its origin explicit and
run local identity validation before a summary; it cannot fabricate SERIES.
Include the embedded entity INS view and its derived-indicator paths in this work.
Comparisons retain per-territory ambiguity and link to detail for resolution;
they do not apply one source coordinate to all selected territories.

When tier-zero ambiguity supplies no non-geographic defaults, expose the source
dimension controls rather than guessing Total by label. Source-row inspection
may fetch a valid geographic scope before every non-geographic dimension is
pinned; selecting a complete row also supplies its classification pins and unit.
A single-series chart requires a complete unique selection. Preserve ambiguity
through hub period filters and keep missing/ambiguous ranking exclusions distinct. Unsupported INS cadences stay visible
in tables/metadata and do not masquerade as annual/monthly chart points.

## Complete fetching and cache transition

Request observation IDs and dimensions/geography in every relevant document.
Preserve hasNextPage and map the native legacy-wire totalCount sentinel -1 to
internal null. Only known counts participate in count-consistency checks. Full-vector consumers either finish
all pages or fail explicitly: no silent max-pages return, empty continuing page,
duplicate cell, contradictory count or partial chart/ranking/export success.
Carry cancellation through every request and log any imposed cap.

For multi-request observation vectors, request the dataset publication token in
the same GraphQL operation as each page. The token must identify the revision and
transform governing both facts and interpretation: metadata.revision_id plus
metadata.transform_contract_sha256 (also retain custody_sha256/published_at for
provenance). Native server roots share one operation-scoped snapshot; tests must
prove page/token consistency in that same operation, not assume the old per-root
snapshot behavior. Raw custody alone is insufficient. Keep
stable ordering as well as duplicate-ID checks. A changed token discards the
entire accumulated vector with a retryable result. An operation snapshot alone
cannot make several HTTP pages share one publication.

Version INS query keys for the native contract, including day-long freshness
and the entity INS hook keys. Include the contract version in detailScopeKey so
stale SSR/CDN loader initialData fails scopeMatches instead of bypassing validation.
Include all explicit source selections and relevant period/unit choices.
Do not use a network failure as permission to switch to mock data.

## Verification

Use equal-valued distinct source tuples, alternatives with disjoint dates,
malformed witnesses, valid explicit coordinates, ambiguous plus healthy siblings,
truncation below the old budget, reordered duplicate rows, missing/changed
publication tokens, repeated/empty pages and cap exhaustion. Confirm desktop and
mobile behavior, source-row inspection, shared URLs and downloads in Romanian and
English. Annual budget factors and geographic-union population remain separate.

Implementation boundary: `src/lib/ins/source-contract.ts` validates the producer
layout (at most seven classification dimensions, then time and unit), signed
PostgreSQL integer source members including zero, complete geographic coordinates
and qualification consistency. `source-series.ts` owns identity inspection;
`source-pages.ts` owns complete-vector paging and publication consistency.
Opaque IDs and original cells are preserved. Consumers must fetch each page and
its descriptor in one GraphQL operation and validate before deriving values.
The server input parser must round-trip the same integer domain before this
client contract is enabled.


## Saved-chart implementation boundary

Saved charts inspect complete source vectors including null cells. The native API uses hasValue=false for null-only, so the chart request omits this filter. Saved hasValue and aggregation options remain readable/editable compatibility fields; they cannot hide missing coverage or merge source alternatives. Missing or unsupported periods, qualified geography and missing values suppress automatic charts while source-row inspection remains available. Explicit sparse date selections require exactly those dates; intervals and unscoped observed spans require complete cadence coverage.

INS-dependent calculations propagate missing coverage and undefined arithmetic through nested expressions and descendants. Numeric constants remain scalars, including nested constant expressions. Rendering omits unavailable values, including relative comparisons with an unavailable reference, rather than replacing them with zero. Transport failures remain retryable with a visible Retry INS data action and stale cache state, preserving healthy siblings. This slice does not enable native INS or certify the remaining detail/hub/entity consumers.

## Latest and dashboard outcome boundary

Native latest and dashboard reads carry the dataset descriptor, original source
cells and geographic witnesses. AVAILABLE outcomes require a certified descriptor,
including NO_DATA. CATALOG_ONLY metadata may remain unpublished only for a latest
NO_DATA outcome. Malformed contract data fails the request; expected ambiguity or
NO_DATA retains healthy siblings. A present null-valued cell is still an
observation, with its source status preserved.

Dashboard history has an explicit server truncation flag. A missing period in
truncated history is unavailable, not proven absent. Period tokens can collide
across cadences: both the headline and period filter require exactly one matching
source cell. Mixed or unsupported cadences retain their cells for inspection but
do not produce an automatic sparkline. An absent or ambiguous selected period
cannot become a data-through freshness claim.

Detail reads use the shared complete-vector collector. Invalid source coordinates
fail before local filtering. Ambiguous or qualified vectors remain inspectable but
do not supply automatic charts or headline values. Native landing and detail SSR
payloads carry a contract stamp; unstamped initialData is not seeded into the new
query caches. Public native reads forward cancellation and omit authentication.

This prerequisite does not enable INS. Remaining release gates include remaining catalog/search bootstrap consumers, strict explicit
source selections, all geographic dimension controls, full source table/CSV
provenance, comparisons/decade/embedded consumers, producer publication and real
workload acceptance. No legacy document may be sent to the native endpoint during
rollout until that consumer has been migrated.


## Dataset metadata and dimension pickers

Dataset-detail and dimension-member pages now use anonymous native transport,
forward cancellation and normalize dataset-code case before request/cache identity.
Available datasets require a certified source descriptor; unpublished catalog-only
metadata requires a valid source dimension layout without invented publication.
Each member page carries its descriptor in the same operation and validates
dataset, dimension role, signed integer member identity and continuation. Invalid
responses fail visibly rather than becoming empty options. A canonical territory
may remain unresolved on a valid source geographic member.

All detail classification and unit controls share one paginated picker, including
small lists. This removes separate capped lists and gives every control loading,
error/retry and continuation behavior. Units remain selectable without a resolved
label. Unknown counts do not hide pagination; offsets advance by returned rows,
and back navigation uses visited offsets. In-flight or previous-search options
cannot be selected. Detail, saved-editor and comparison metadata keys are versioned.

This is bootstrap/picker plumbing, not INS enablement. Strict explicit URL/source
selection, all geographic-axis controls, complete source-vector comparisons and
other catalog/search consumers remain gates. The comparison browser fixtures
validate synthetic metadata compatibility, not geographic/source-series parity.
