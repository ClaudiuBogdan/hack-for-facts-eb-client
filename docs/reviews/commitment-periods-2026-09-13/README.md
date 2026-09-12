# Native commitments interval panel — 2026-09-13

Chronos's entity and municipality pages expose a native Commitments tab. It reads
`budgetCommitmentPeriods` through `/api/v1/graphql`, using the public transport
without waiting for Clerk. Identity and the interval request are independent of
execution line-item loading/errors. Legacy commitments requests remain disabled
on redesign-only deployments.

The table shows exact reported start/end months and nominal RON amounts excluding
transfers. Endpoint-month filters and pagination are URL-backed. Changing entity,
year or report type resets pagination. Different report/sector intervals stay
separate; no overlapping-interval total is manufactured. Exact decimal text stays
text through rendering. Source-empty is unavailable, while an admitted zero is
zero. Public source links open separately. Published terminal-month bounds expose
mixed/early endpoints without claiming complete capture.

The API returns all thirteen measures. This small table displays commitments,
treasury payments and non-treasury payments. It deliberately does not inherit the
page's currency/inflation/per-capita label: its own nominal RON label is explicit.

## Verification

- Astra xhigh advisory and final delta review: no blocking findings.
- GLM security-only review requested as `zai-coding-plan/glm-5.3#max`, read-only
  plan mode. Reviewed as lower-trust advice; no blocking new security issue.
- Client types/lint and production SSR build passed.
- 121 focused tests passed: the native page remains available during fiscal
  loading/errors; the legacy component is not mounted; routes, URL controls,
  exact cents, malformed API values, unavailable results and retries are covered.
- Lingui extraction/compilation completed; new Romanian/English strings translated.
- Logs: `/private/tmp/commitment-periods-20260913/`.

## Deliberately unfinished

This is the interval-reader prerequisite, not the complete commitments program.
Regular normalized cards, charts, and classification breakdowns still need their
native migration. The native server has summary/timeseries reads, but no complete
commitment classification aggregate or matching normalization contract. Do not
revive retired GraphQL roots or fabricate totals from a capped line-item page.

GLM additionally raised pre-existing free-text/analytics URL size bounds outside
this slice. Record for the general URL-input review; do not expand this migration
into a routing rewrite. Its new-link scheme concern is covered by the HTTP(S)
source constraint and client URL validation; arbitrary-host source citations are
intentional, with no HTML rendering or auth token in the link.

No Chronos data or deployed application was changed during implementation.
Deployed API/client verification is still required before the publisher asserts
interval-read-model readiness. Whole-year membership and financial correctness
remain the publication audit's responsibility.
