import {
  createStartHandler,
  defaultStreamHandler,
  getResponseStatus,
} from '@tanstack/react-start/server'
import type { Register } from '@tanstack/react-router'
import type { RequestHandler } from '@tanstack/react-start/server'
import { resolveSsrResponseStatus } from '@/lib/ssr/response-status'

/**
 * The default TanStack Start server entry, plus one thing: a status a loader
 * set with `setResponseStatus` reaches the HTML response. The stream renderer
 * reads the router's status store, so without this the entity page's
 * "served past the SSR deadline" 503 would go out as a 200 (its headers do
 * get merged). See `src/lib/ssr/response-status.ts`.
 */
const fetch: RequestHandler<Register> = createStartHandler((ctx) => {
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

export default { fetch }
