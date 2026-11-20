# DA-006: Analytics' browser names lookup does not carry the key it was planned under

**Status:** open · Filed 2026-11-20 (DA-001 residual 8, accepted by root) · **Priority:** P2. The API's own check
still applies, so no withheld name is served.

- **Where:** `src/features/procurement/hooks/use-procurement-analytics.ts`, `useNames`: `planNames(keys)` is called
  without `disclosureSeen`. The server render passes the key taken when the ranking settled
  (`procurement-analytics-ssr.ts`, `rankingSeen`).
- **Effect:** in the browser, a names lookup that starts after the newest key moved is checked against the key at
  its start, not the one the ranking's codes were read under. Each DA name is still kept only if it was served
  under the plan's publication (`servedUnderPlan`) and the publication, asked afresh, is unchanged.
- **Fix:** take the newest key when the ranking's answer arrives and pass it to `planNames`, as the server render
  does.
