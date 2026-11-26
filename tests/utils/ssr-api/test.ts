/**
 * `test` for a spec whose reads are recorded (TEST-001, the server side): the browser's GraphQL reads are answered
 * by the same fixture store as the server render's (`server.mjs`), and after each test every read the spec made
 * must have come from a fixture. A spec built on it never reads the live API, and never passes on a server cache
 * the live API warmed.
 *
 * What is checked after each test, from the server's judged mark (see `judge`):
 * - every browser read, and every national budget read on either side;
 * - with one worker (CI), every other server read made during the test too. With more, the app server's reads
 *   can't be told apart by test, so only the first kind is checked.
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
    async ({ page }, use, testInfo) => {
      // Where the last check, in this worker or a previous one, ended (see `judge`).
      const start = await judgedMark()
      // Server reads before this point belong to earlier tests, this spec's or another's; with one worker, every one after it is this test's.
      const before = await readsAfter(start)
      const started = testInfo.config.workers === 1 ? (before[before.length - 1]?.seq ?? start) : null
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
      const { unserved, mark } = judge(await readsAfter(start), start, started)
      // Moved on before the verdict, so a failure doesn't leave its reads to be judged again.
      await markJudged(mark)
      expect(unserved, 'reads not answered from a fixture (tests/fixtures/ssr-api; record with SSR_API_MODE=record)').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
