/**
 * Where the cookie settings page may send a reader back to.
 *
 * Only a same-origin path: the value is resolved against a throwaway origin
 * and must stay on it, which rejects `//host`, `/\\host` (browsers read the
 * backslash as a slash) and absolute URLs. The normalised path is returned
 * rather than the raw string, so what the router is handed always parses —
 * a raw `/\\[` passed a prefix check and then threw inside navigation.
 */
const PROBE_ORIGIN = 'http://redirect.invalid'

export function sanitizeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/')) return undefined
  if (value.startsWith('//') || value.startsWith('/\\')) return undefined
  try {
    const url = new URL(value, PROBE_ORIGIN)
    if (url.origin !== PROBE_ORIGIN) return undefined
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return undefined
  }
}
