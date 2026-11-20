import { ServerResponse } from 'node:http'
import { definePlugin } from 'nitro'
import { currentCrawlGuard, guardedFetch, isGuardOn, noindexNodeResponses } from './crawl-guard'

/**
 * Puts the crawl guard in front of the app's fetch handler. The Nitro node
 * server reads `nitroApp.fetch` after plugins have run, so the wrapper sees
 * every request, `public/` files included. With both switches unset (prod)
 * nothing is replaced. See `crawl-guard.ts`.
 */
export default definePlugin((nitroApp) => {
  const guard = currentCrawlGuard()
  if (!isGuardOn(guard)) return
  if (guard.disallowAll) noindexNodeResponses(ServerResponse.prototype as never)
  nitroApp.fetch = guardedFetch(
    guard,
    nitroApp.fetch,
    (line) => {
      process.stdout.write(line + '\n')
    },
    undefined,
    (error) => {
      // This build has no Nitro error hook: the details go to stderr as well.
      process.stderr.write(`crawl-guard: unanswered rejection: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`)
      nitroApp.captureError?.(error as Error, { tags: ['crawl-guard'] })
    },
  )
})
