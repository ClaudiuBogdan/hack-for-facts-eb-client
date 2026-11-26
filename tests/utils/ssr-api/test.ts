/**
 * `test` for a spec whose pages read the national budget (TEST-001, the server side): the browser's GraphQL reads
 * are answered by the same fixture store as the server render's (`server.mjs`), and after each test every read the
 * browser made, and every national budget read on either side, must have come from a fixture. A spec built on it
 * never reads the live API, and never passes on a server cache the live API warmed.
 */
import { expect, test as base } from '../integration-base'
import { judge, type Read } from './check'

export const SSR_API_ORIGIN = `http://127.0.0.1:${process.env.PLAYWRIGHT_SSR_API_PORT ?? 3199}`

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SSR_API_ORIGIN}${path}`, init).catch(() => null)
  if (!response?.ok) throw new Error(`The test API (${SSR_API_ORIGIN}, tests/utils/ssr-api/server.mjs) isn't answering: run the integration project as playwright.config.ts starts it.`)
  return (await response.json()) as T
}

const judgedMark = async () => (await api<{ readonly judged: number }>('/__ssr-api/judged')).judged
const readsAfter = (seq: number) => api<readonly Read[]>(`/__ssr-api/reads?after=${seq}`)
const markJudged = (seq: number) => api(`/__ssr-api/judged?upTo=${seq}`, { method: 'POST' })

export const test = base.extend<{ ssrApi: void }>({
  ssrApi: [
    async ({ page }, use) => {
      // Where the last check, in this worker or a previous one, ended (see `judge`).
      const start = await judgedMark()
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
      const { unserved, mark } = judge(await readsAfter(start), start)
      // Moved on before the verdict, so a failure doesn't leave its reads to be judged again.
      await markJudged(mark)
      expect(unserved, 'reads not answered from a fixture (tests/fixtures/ssr-api; re-record with SSR_API_MODE=record)').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
