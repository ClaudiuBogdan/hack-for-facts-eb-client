/**
 * Map e-licitatie / SEAP **custody** URLs to human-openable **client** views.
 *
 * Why this exists
 * ---------------
 * The scrapper and GraphQL API store `source_url` as the retrievable
 * `api-pub/...` endpoint used for extraction (custody terminator), e.g.:
 *
 *   https://e-licitatie.ro/api-pub/PublicDirectAcquisition/getView/119138224
 *   https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100245309
 *
 * Those URLs return JSON (or 403 outside a browser session) — they are not the
 * public portal pages journalists expect. The matching client views are:
 *
 *   https://e-licitatie.ro/pub/direct-acquisition/view/119138224
 *   https://e-licitatie.ro/pub/notices/ca-notices/view-c/100245309
 *
 * (Confirmed by the scrapper's own referer URLs when fetching detail.)
 *
 * We rewrite known `api-pub` patterns here so every outbound "Open on
 * e-licitatie" link opens the portal, even when the API still returns the
 * raw custody URL. Unrecognized hosts/paths are left unchanged (TED, data.gov,
 * already-`/pub/` URLs, etc.).
 */

const ELICITATIE_HOSTS = new Set([
  'e-licitatie.ro',
  'www.e-licitatie.ro',
  'sicap-prod.e-licitatie.ro',
])

/** Canonical public origin used for rewritten client links. */
const ELICITATIE_PUBLIC_ORIGIN = 'https://e-licitatie.ro'

/**
 * `/api-pub/<Resource>/<action>/<id>` → `/pub/...` client path.
 * Action is optional (CA notices use `get/{id}`).
 */
const API_PUB_TO_CLIENT: ReadonlyArray<{
  readonly pattern: RegExp
  readonly clientPath: (id: string) => string
}> = [
  {
    // Direct acquisitions — scrapper: elicitatieDirectAcquisitionSourceUrl
    pattern: /^\/api-pub\/PublicDirectAcquisition\/getView\/([^/]+)\/?$/i,
    clientPath: (id) => `/pub/direct-acquisition/view/${id}`,
  },
  {
    // CA award notices / procedures / contracts keyed on ca_notice_id —
    // scrapper: elicitatieCaNoticeSourceUrl + referer view-c/{id}
    pattern: /^\/api-pub\/C_PUBLIC_CANotice\/get\/([^/]+)\/?$/i,
    clientPath: (id) => `/pub/notices/ca-notices/view-c/${id}`,
  },
]

function isElicitatieHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (ELICITATIE_HOSTS.has(host)) return true
  return host.endsWith('.e-licitatie.ro')
}

/**
 * Rewrite an e-licitatie `api-pub` custody URL to the public portal view.
 * Returns `null` for null/empty input; otherwise the (possibly rewritten) URL.
 */
export function toElicitatieClientUrl(
  sourceUrl: string | null | undefined,
): string | null {
  if (sourceUrl == null) return null
  const trimmed = sourceUrl.trim()
  if (trimmed === '') return null

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return trimmed
  }

  if (!isElicitatieHost(parsed.hostname)) {
    return trimmed
  }

  const pathname = parsed.pathname
  for (const rule of API_PUB_TO_CLIENT) {
    const match = pathname.match(rule.pattern)
    if (match?.[1]) {
      const id = decodeURIComponent(match[1])
      return `${ELICITATIE_PUBLIC_ORIGIN}${rule.clientPath(id)}`
    }
  }

  return trimmed
}
