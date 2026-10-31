import { attemptChunkRecovery } from '@/lib/chunk-recovery'
import { dynamicActivate } from '@/lib/i18n'

/**
 * Activates the page's language before the browser hydrates it, and says
 * whether to hydrate.
 *
 * Hydrating without the page's catalog would swap the server's text for
 * message ids ("JB48yS J6wkqO"), on every string of the page (2026-10-28
 * review, REV-03). So when the catalog cannot load — a flaky request, or an
 * old page asking for a chunk a deploy removed — the page is loaded afresh
 * once, which can fetch it (`attemptChunkRecovery`, which also skips offline
 * and a second try within minutes); otherwise it stays as the server rendered
 * it: readable, in its language, its links plain page loads. Retrying the
 * import in place would not help: the browser keeps a failed module's error.
 */
export async function activateLanguageForHydration(
  locale: string,
  pathname: string,
): Promise<boolean> {
  try {
    await dynamicActivate(locale, { pathname })
    return true
  } catch (error) {
    attemptChunkRecovery(error)
    if (import.meta.env.DEV) {
      console.error('Failed to load translations; the page stays as the server rendered it:', error)
    }
    return false
  }
}
