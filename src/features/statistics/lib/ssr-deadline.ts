import { createLogger } from '@/lib/logger'
import { withDeadline } from '@/lib/ssr/deadline-signal'

/**
 * The deadline for an INS page's server-side reads.
 *
 * TanStack Start sends no HTML until every loader resolves, and the API's own
 * timeout is minutes. Past the deadline each read fails as a read — the hub
 * names the section, the dataset page serves its retry — the render goes out
 * `no-store`, and the browser reads again with no deadline at all.
 *
 * The default sits well above the normal path (a hub read is two round
 * trips of about half a second each through Cloudflare from the dev VM).
 * `INS_SSR_DEADLINE_MS` overrides it at runtime; `0` disables it.
 */
export const DEFAULT_INS_SSR_DEADLINE_MS = 5_000
export const INS_SSR_DEADLINE_ENV_KEY = 'INS_SSR_DEADLINE_MS'
/** Node clamps a longer `setTimeout` delay to 1 ms, which would time out every render. */
export const MAX_INS_SSR_DEADLINE_MS = 2_147_483_647

const logger = createLogger('ins-ssr-deadline')

type EnvSource = Readonly<Record<string, string | undefined>>

function readProcessEnv(): EnvSource {
  if (typeof process === 'undefined') return {}
  return process.env ?? {}
}

/**
 * `undefined` means no deadline: `0`, or anything that is not a plain number
 * of milliseconds within Node's timer range — a wrong deadline is worse than none.
 */
export function resolveInsSsrDeadlineMs(env: EnvSource = readProcessEnv()): number | undefined {
  const raw = env[INS_SSR_DEADLINE_ENV_KEY]?.trim()
  if (raw === undefined || raw === '') return DEFAULT_INS_SSR_DEADLINE_MS
  if (!/^\d+$/u.test(raw)) {
    logger.warn('Ignoring a non-numeric INS SSR deadline; the deadline is disabled', { value: raw })
    return undefined
  }
  const parsed = Number(raw)
  if (parsed > MAX_INS_SSR_DEADLINE_MS) {
    logger.warn('The INS SSR deadline exceeds the timer range; the deadline is disabled', {
      value: raw,
      maxMs: MAX_INS_SSR_DEADLINE_MS,
    })
    return undefined
  }
  return parsed === 0 ? undefined : parsed
}

/**
 * The loader's signal under the deadline, on the server. In the browser the
 * pending states cover a slow read, so the signal passes through untouched.
 */
export function insLoaderSignal(signal: AbortSignal, isServer = typeof window === 'undefined'): AbortSignal {
  if (!isServer) return signal
  return withDeadline(signal, resolveInsSsrDeadlineMs()) ?? signal
}
