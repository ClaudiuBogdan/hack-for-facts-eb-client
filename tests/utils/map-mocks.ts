/**
 * The map's grouped-series read (`POST /api/v1/advanced-map-analytics/grouped-series`,
 * `src/lib/api/map-series.ts`), answered from the dev API's own answers (TEST-001). Two recordings, made on
 * 2026-11-25, each the request the page sent and the API's answer, every UAT for 2025:
 *
 * - the landing's budget map: income and expenses (`fixtures/shared/grouped-series-uat-2025-income-expenses.json`);
 * - the entity page's map: expenses (`fixtures/shared/grouped-series-uat-2025-expenses.json`).
 *
 * A request is answered by the recording with the same granularity and series ids. Any other falls through to
 * the next route, and with no other route to the API guard, which fails it in CI. The `/map` spec answers
 * this read with its own routes, registered later, so they win.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

type Request = { readonly granularity?: string; readonly series?: ReadonlyArray<{ readonly id: string }> }
type Recording = { readonly request: Request; readonly response: unknown }

const SHARED = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/shared')
const RECORDINGS: readonly Recording[] = ['grouped-series-uat-2025-income-expenses', 'grouped-series-uat-2025-expenses'].map(
  (name) => JSON.parse(readFileSync(join(SHARED, `${name}.json`), 'utf8')) as Recording,
)

const idsOf = (request: Request | null | undefined) => (request?.series ?? []).map((series) => series.id).join(',')

export async function mockMapReads(page: Page): Promise<void> {
  await page.route('**/api/v1/advanced-map-analytics/grouped-series', async (route) => {
    const request = route.request().postDataJSON() as Request | null
    const recording = RECORDINGS.find((r) => r.request.granularity === request?.granularity && idsOf(r.request) === idsOf(request))
    if (!recording) return route.fallback()
    return route.fulfill({ json: recording.response })
  })
}
