/**
 * The map's grouped-series read (`POST /api/v1/advanced-map-analytics/grouped-series`,
 * `src/lib/api/map-series.ts`), answered from the dev API's own answers (TEST-001). Two recordings, made on
 * 2026-11-25, each the request the page sent and the API's answer, every UAT for 2025:
 *
 * - the landing's budget map: income and expenses (`fixtures/shared/grouped-series-uat-2025-income-expenses.json`);
 * - the entity page's map: expenses (`fixtures/shared/grouped-series-uat-2025-expenses.json`).
 *
 * A request is answered by the recording that asked the same question: the same granularity and, series by
 * series, the same id and filter (year, account, report type, scope, unit). Any other falls through to the next
 * route, and with no other route to the API guard, which fails it in CI: a page that asks for another year
 * (the landing's is `BUDGET_YEAR`) needs a new recording, never the 2025 one. The `/map` spec answers this read
 * with its own routes, registered later, so they win.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

type Request = { readonly granularity?: string; readonly series?: ReadonlyArray<{ readonly id: string; readonly filter?: unknown }> }
type Recording = { readonly request: Request; readonly response: unknown }

const SHARED = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/shared')
const RECORDINGS: readonly Recording[] = ['grouped-series-uat-2025-income-expenses', 'grouped-series-uat-2025-expenses'].map(
  (name) => JSON.parse(readFileSync(join(SHARED, `${name}.json`), 'utf8')) as Recording,
)

/** JSON with object keys sorted, so two filters compare by content, not by key order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/** What a request asks: its granularity, and each series' id and filter. */
const questionOf = (request: Request | null | undefined) =>
  canonical({ granularity: request?.granularity, series: (request?.series ?? []).map((series) => ({ id: series.id, filter: series.filter })) })

export async function mockMapReads(page: Page): Promise<void> {
  await page.route('**/api/v1/advanced-map-analytics/grouped-series', async (route) => {
    const question = questionOf(route.request().postDataJSON() as Request | null)
    const recording = RECORDINGS.find((r) => questionOf(r.request) === question)
    if (!recording) return route.fallback()
    return route.fulfill({ json: recording.response })
  })
}
