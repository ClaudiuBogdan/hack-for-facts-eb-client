# Native budget transport on Chronos dev

This slice moves executionAnalytics and the four budget dimension roots to the
existing shared `/api/v1/graphql` transport. Filters and public wire fields stay
unchanged. All moved reads are anonymous and forward caller cancellation signals.
Only execution analytics moves in charts.ts; static chart analytics remains a
separate pending native port. Entity/UAT/county adapters also remain pending.
The standalone Chronos app does not mount `/graphql`; retained callers are known
migration work, not proof those pages work.

Catalog and selected-label reads now retrieve every page. Request sizes are 200
for sectors/funding sources and 2,000 for classifications, with continuation driven
by pageInfo and actual returned length. Invalid or duplicate raw identities,
inconsistent counts, premature completion and stalled pages fail the whole read.
These guards do not provide a release-consistent snapshot across separate requests.
Classification display code trimming happens only after complete raw retrieval.

Catalog errors propagate to existing query/label consumers. The label store still
logs failures and displays an ID placeholder; the classification explorer retains
its existing static fallback. This slice does not claim new visible error UX.
Four dimension-label storage keys and moved query cache keys have native namespaces
so old cached names cannot hide catalog corrections. Entity/UAT storage is unchanged.

Design and code reviews: Astra high and local Claude Fable high. Local OpenCode2
zai-coding-plan/glm-5.3 performs security review. Tests cover endpoint/variable/auth
and cancellation boundaries, a catalog beyond the server cap, overlapping pages,
count changes, incomplete responses, and pre-existing browser label storage.
Deployment and final verification evidence live in the scrapper migration tracker.

Live validation caught sector/funding label documents declaring `[String!]` where
native filters require `[ID!]`. Both now declare IDs; wire-contract regression
tests exercise the actual declarations. Eleven exact documents passed live public API
checks, including all 1,121 functional and 760 economic catalog rows.
