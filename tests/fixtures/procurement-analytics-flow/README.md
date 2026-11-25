# procurement-analytics-flow fixtures

Every GraphQL read the browser makes in `tests/integration/procurement-analytics.spec.ts`, so the spec reads no live API (TEST-001).

- `browser-reads.json` lists each read: its operation, its exact variables as the app sends them, and the fixture that answers
  it. The spec registers one mock per entry.
- Each fixture is the dev API's answer to the app's own query, with those variables. They were recorded on 25 November 2026 over
  repeated local runs, until a run in mock mode left no read unmatched. Mocked answers make the page read further than live ones,
  and some reads leave as a test ends, so a single recording is not enough.
- No personal data: no 13-digit run is in any fixture. The analytics answers are aggregates and CPV rankings, with no party names.
- Legacy reads are answered as the API now answers them (`SERVICE_UNAVAILABLE`, legacy procurement switched off). They go away
  with the reads (client PROC-001).

To re-record after the page's reads change: run the spec in mock mode. List every "[mockApi] No mock found" operation with its
variables, answer each from the dev API with the app's own query, and add it to `browser-reads.json`. Check for 13-digit runs
before committing.
