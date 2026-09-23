import { createLogger } from '@/lib/logger'

/**
 * Server-side deadline for the entity page's blocking SSR work.
 *
 * TanStack Start sends no HTML until every route loader has resolved, so a
 * slow API freezes the tab on the previous page — the `pendingComponent` only
 * exists on the client. Past the deadline the loader stops waiting for the
 * blocking queries and serves the shell: the client fetches the same queries,
 * renders the page's own loading states meanwhile, and re-runs the loader once
 * to restore the entity's `<head>` (see the lazy route).
 *
 * The default sits well above the normal path (entity details take ~0.1s from
 * inside the cluster and ~0.5s from the dev VM through Cloudflare), so SEO
 * metadata only goes missing when the API is genuinely slow — and that
 * response is a 503 served `no-store`, so crawlers, link unfurlers and caches
 * treat it as temporary rather than as the page.
 *
 * `ENTITY_PAGE_SSR_DEADLINE_MS` overrides the default at runtime; `0` disables
 * the deadline and restores the wait-for-everything behaviour.
 */
export const DEFAULT_ENTITY_PAGE_SSR_DEADLINE_MS = 2_000
export const ENTITY_PAGE_SSR_DEADLINE_ENV_KEY = 'ENTITY_PAGE_SSR_DEADLINE_MS'
/** Node clamps longer `setTimeout` delays to 1ms, which would time out every render. */
export const MAX_ENTITY_PAGE_SSR_DEADLINE_MS = 2_147_483_647

const logger = createLogger('entity-page-ssr-deadline')

export type EntityPageSsrDeadline = {
  readonly deadlineMs: number
  readonly startedAt: number
  readonly now: () => number
}

export type DeadlineOutcome<T> =
  | { readonly status: 'resolved'; readonly value: T }
  | { readonly status: 'timed-out' }

type EnvSource = Readonly<Record<string, string | undefined>>

function readProcessEnv(): EnvSource {
  if (typeof process === 'undefined') return {}
  return process.env ?? {}
}

/**
 * `undefined` means "no deadline". An unset or blank variable keeps the
 * default. `0` disables the deadline; so does anything that is not a plain
 * number of milliseconds within Node's timer range, with a warning, because a
 * wrong deadline is worse than none.
 */
export function resolveEntityPageSsrDeadlineMs(
  env: EnvSource = readProcessEnv(),
): number | undefined {
  const raw = env[ENTITY_PAGE_SSR_DEADLINE_ENV_KEY]?.trim()
  if (raw === undefined || raw === '') {
    return DEFAULT_ENTITY_PAGE_SSR_DEADLINE_MS
  }

  const parsed = /^\d+$/u.test(raw) ? Number(raw) : Number.NaN
  if (Number.isNaN(parsed)) {
    logger.warn('Ignoring non-numeric SSR deadline; the deadline is disabled', {
      variable: ENTITY_PAGE_SSR_DEADLINE_ENV_KEY,
      value: raw,
    })
    return undefined
  }

  if (parsed === 0) {
    return undefined
  }

  if (parsed > MAX_ENTITY_PAGE_SSR_DEADLINE_MS) {
    logger.warn('SSR deadline exceeds the timer range; the deadline is disabled', {
      variable: ENTITY_PAGE_SSR_DEADLINE_ENV_KEY,
      value: raw,
      maxMs: MAX_ENTITY_PAGE_SSR_DEADLINE_MS,
    })
    return undefined
  }

  return parsed
}

/** Only the server gets a deadline: on the client the pending component covers slow loaders. */
export function createEntityPageSsrDeadline(
  params: {
    readonly deadlineMs?: number
    readonly now?: () => number
    readonly isServer?: boolean
  } = {},
): EntityPageSsrDeadline | undefined {
  const isServer = params.isServer ?? typeof window === 'undefined'
  if (!isServer) return undefined

  const deadlineMs = params.deadlineMs ?? resolveEntityPageSsrDeadlineMs()
  if (deadlineMs === undefined) return undefined

  const now = params.now ?? Date.now
  return { deadlineMs, startedAt: now(), now }
}

export function remainingDeadlineMs(deadline: EntityPageSsrDeadline): number {
  return Math.max(0, deadline.deadlineMs - (deadline.now() - deadline.startedAt))
}

/**
 * Race `promise` against what is left of the deadline. Without a deadline the
 * promise is simply awaited. An already-settled promise always wins, even at
 * zero remaining time, so cached data never times out.
 *
 * When the deadline wins, the losing promise keeps running. `Promise.race`
 * stays subscribed to it, so a later rejection is observed and never surfaces
 * as an unhandled rejection after the loader has returned.
 */
export async function settleWithinDeadline<T>(
  promise: Promise<T>,
  deadline: EntityPageSsrDeadline | undefined,
): Promise<DeadlineOutcome<T>> {
  const settled = promise.then(
    (value): DeadlineOutcome<T> => ({ status: 'resolved', value }),
  )

  if (!deadline) {
    return settled
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<DeadlineOutcome<T>>((resolve) => {
    timer = setTimeout(
      () => resolve({ status: 'timed-out' }),
      remainingDeadlineMs(deadline),
    )
  })

  try {
    return await Promise.race([settled, timedOut])
  } finally {
    clearTimeout(timer)
  }
}
