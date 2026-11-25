/**
 * `test` for a spec whose pages read the national budget (TEST-001, the server side): the browser's GraphQL reads
 * are answered by the same fixture store as the server render's (`server.mjs`), and after each test every read the
 * browser made, and every national budget read on either side, must have come from a fixture. A spec built on it
 * never reads the live API, and never passes on a server cache the live API warmed.
 */
import { expect, test as base } from '../integration-base'

export const SSR_API_ORIGIN = `http://127.0.0.1:${process.env.PLAYWRIGHT_SSR_API_PORT ?? 3199}`

type Read = { readonly seq: number; readonly source: string; readonly key: string; readonly from: string; readonly nationalBudget: boolean }

async function readsAfter(seq: number): Promise<readonly Read[]> {
  const response = await fetch(`${SSR_API_ORIGIN}/__ssr-api/reads?after=${seq}`).catch(() => null)
  if (!response?.ok) throw new Error(`The test API (${SSR_API_ORIGIN}, tests/utils/ssr-api/server.mjs) isn't answering: run the integration project as playwright.config.ts starts it.`)
  return (await response.json()) as readonly Read[]
}

/** Where the last test's check ended: a read that lands after a test's check (a page still closing) is the next test's. */
let checked = 0

export const test = base.extend<{ ssrApi: void }>({
  ssrApi: [
    async ({ page }, use) => {
      const start = checked
      await page.route('**/graphql', async (route) => {
        // A preflight is no read: answered here, never sent out.
        if (route.request().method() !== 'POST') {
          return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' } })
        }
        const answer = await fetch(`${SSR_API_ORIGIN}/api/v1/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-ssr-api-from': 'browser' },
          body: route.request().postData() ?? '{}',
        })
        await route.fulfill({ status: answer.status, headers: { 'content-type': 'application/json' }, body: await answer.text() })
      })
      await use()
      const reads = await readsAfter(start)
      checked = reads[reads.length - 1]?.seq ?? start
      const unserved = reads.filter((read) => (read.from === 'browser' || read.nationalBudget) && read.source !== 'fixture' && read.source !== 'recorded')
      expect(unserved, 'reads not answered from a fixture (tests/fixtures/ssr-api; re-record with SSR_API_MODE=record)').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
