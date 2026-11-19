import { definePlugin } from 'nitro'
import { currentCrawlGuard, guardedFetch, isGuardOn } from './crawl-guard'

/**
 * Puts the crawl guard in front of the app's fetch handler. The Nitro node
 * server reads `nitroApp.fetch` after plugins have run, so the wrapper sees
 * every request, `public/` files included. With both switches unset (prod)
 * nothing is replaced. See `crawl-guard.ts`.
 */
export default definePlugin((nitroApp) => {
  const guard = currentCrawlGuard()
  if (!isGuardOn(guard)) return
  nitroApp.fetch = guardedFetch(guard, nitroApp.fetch, (line) => {
    process.stdout.write(line + '\n')
  })
})
