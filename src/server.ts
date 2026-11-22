import {
  createStartHandler,
  defaultStreamHandler,
  getResponseStatus,
} from '@tanstack/react-start/server'
import type { Register } from '@tanstack/react-router'
import type { RequestHandler } from '@tanstack/react-start/server'
import { installServerCatalogs } from '@/lib/i18n-server-catalogs'
import {
  installRequestScopedI18n,
  runWithRequestI18n,
} from '@/lib/i18n-request-scope'
import { resolveSsrResponseStatus } from '@/lib/ssr/response-status'
import { withDaNameScope } from '@/lib/ssr/da-name-scope'

installRequestScopedI18n()
installServerCatalogs()

/**
 * The default TanStack Start server entry, plus three things:
 * - each request gets its own Lingui state (`lib/i18n-request-scope.ts`), so
 *   concurrent renders keep their own language and catalogs;
 * - a status a loader set with `setResponseStatus` reaches the HTML response.
 *   The stream renderer reads the router's status store, so without this the
 *   entity page's "served past the SSR deadline" 503 would go out as a 200
 *   (its headers do get merged). See `src/lib/ssr/response-status.ts`;
 * - a render that names a direct-purchase supplier goes out `no-store`, so no
 *   cache keeps the name (root ruling 2026-11-22 under API 22a47bb2). See
 *   `src/lib/ssr/da-name-scope.ts`.
 */
const startFetch: RequestHandler<Register> = createStartHandler((ctx) => {
  const { router } = ctx
  const status = resolveSsrResponseStatus({
    routerStatus: router.stores.statusCode.get(),
    responseStatus: getResponseStatus(),
  })
  if (status !== router.stores.statusCode.get()) {
    router.stores.statusCode.set(status)
  }

  return defaultStreamHandler(ctx)
})

const fetch: RequestHandler<Register> = (
  ...args: Parameters<typeof startFetch>
) => runWithRequestI18n(() => withDaNameScope(() => startFetch(...args)))

export default { fetch }
