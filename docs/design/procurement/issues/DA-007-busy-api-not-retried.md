# DA-007: Procurement reads ignore the API's busy answer and its retry hint

**Status:** open · Filed 2026-11-20 (root, after the dev API's ClickHouse read cap) · **Priority:** P3. With the cap in
place a refused read is rare; when one happens the page shows that read as failed.

- **What the API does now (dev, image d30b7590):** each API pod sends at most 3 ClickHouse reads at a time and queues
  the rest for up to 10 s. When the queue is full or a wait passes 10 s, the read answers a GraphQL error with
  `extensions.code = SERVICE_UNAVAILABLE` and `extensions.retryAfterSeconds = 2` ("procurement analytics is busy;
  retry shortly"). Before the cap, refused reads came back as `INTERNAL_SERVER_ERROR`.
- **Where:** the client ignores `retryAfterSeconds`. In the browser, most procurement queries retry once, after
  TanStack's default delay of about a second (`src/lib/queryClient.ts`, `shouldRetryQuery`), often inside the busy spell. The
  analytics records read does not retry at all (`use-procurement-analytics.ts`, `useRecords`: `retry: false`). The
  analytics server render does not retry. A failed records read does not stop the render being cached
  (`procurement-analytics-ssr.ts`: the records stay out of `complete`, by design), so a busy moment can leave a
  publicly cached page whose list the browser reads again. Only entity search
  (`src/features/entity-search/api/search-withheld-error.ts`), the budget analytics error
  (`src/components/entity-analytics/BudgetAnalyticsError.tsx`) and national-budget analytics
  (`src/features/national-budget/analytics/api/national-budget-api.ts`) look at `SERVICE_UNAVAILABLE`.
- **Effect:** a busy moment loses that read. A server read that fails goes out `no-store`, except the records. In the
  browser it shows as a failed read with a retry button.
- **Fix:** retry a read that fails with `SERVICE_UNAVAILABLE` after `retryAfterSeconds` (capped), the records read
  included, in the browser's query retry. On the server, retry only if the wait still fits the render's budget
  (`SSR_BUDGET_MS`). Other errors keep the current policy.
