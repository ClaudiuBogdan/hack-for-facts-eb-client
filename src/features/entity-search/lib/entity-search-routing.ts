/**
 * Deep-link routing for entity-search hits. Pure + table-driven so it is
 * unit-testable in isolation and component-free.
 *
 * `doc_key` is NOT a universal route id — each doc type routes differently:
 *
 *   doc_type            target
 *   ------------------  -------------------------------------------------------
 *   company             /companies/$cui          (internal, cuis[0])
 *   organization        /entities/$cui           (internal, cuis[0])
 *   public_enterprise   /entities/$cui           (internal, cuis[0])
 *   ngo                 /entities/$cui           (internal, cuis[0])
 *   member              /parlament/membri/$id    (internal, best-effort docId)
 *   bill                /parlament/proiecte/$id  (internal, best-effort docId)
 *   legal_act           url                      (external, new tab)
 *   mo_act              url                      (external, new tab)
 *   pnrr_project        url                      (external, new tab)
 *   pnrr_entity         url                      (external, new tab)
 *   procurement_*       url                      (external, new tab)
 *
 * When no usable target can be built (e.g. a CUI-spine hit with no `cuis`, or an
 * interim hit with no `url`), `entityHref` returns `null` so the component can
 * render the row as non-clickable rather than linking to a broken `#`.
 */

/** The subset of a hit `entityHref` needs to compute a deep-link. */
export interface EntityRoutingInput {
  readonly docType: string
  readonly cuis: readonly string[]
  readonly docId: string | null
  readonly docKey: string | null
  readonly url: string | null
}

export interface EntityHref {
  /** Internal route path or external url. */
  readonly href: string
  /** True for an external url (open in a new tab). */
  readonly isExternal: boolean
}

/** CUI-spine doc types route to an internal profile page via `cuis[0]`. */
const CUI_SPINE_ROUTES: Readonly<Record<string, (cui: string) => string>> = {
  company: (cui) => `/companies/${cui}`,
  organization: (cui) => `/entities/${cui}`,
  public_enterprise: (cui) => `/entities/${cui}`,
  ngo: (cui) => `/entities/${cui}`,
}

/** Parliament doc types route internally off their `docId`, best-effort. */
const PARLIAMENT_ROUTES: Readonly<Record<string, (id: string) => string>> = {
  member: (id) => `/parlament/membri/${id}`,
  bill: (id) => `/parlament/proiecte/${id}`,
}

function firstNonEmpty(values: readonly string[]): string | null {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

/**
 * Compute the deep-link for a hit. Returns `null` when no usable target exists.
 *
 * Resolution order per doc type:
 * - CUI-spine: internal route from `cuis[0]`; if no CUI, fall back to `url`.
 * - parliament: internal route from `docId`; if no `docId`, fall back to `url`.
 * - interim/unknown: external `url`.
 */
export function entityHref(hit: EntityRoutingInput): EntityHref | null {
  const externalUrl = makeExternal(hit.url)

  const cuiRoute = CUI_SPINE_ROUTES[hit.docType]
  if (cuiRoute) {
    const cui = firstNonEmpty(hit.cuis)
    if (cui) return { href: cuiRoute(cui), isExternal: false }
    return externalUrl
  }

  const parliamentRoute = PARLIAMENT_ROUTES[hit.docType]
  if (parliamentRoute) {
    const id = hit.docId?.trim()
    if (id) return { href: parliamentRoute(id), isExternal: false }
    return externalUrl
  }

  // Interim types (legal_act, mo_act, procurement_*, pnrr_*) and any unknown
  // doc type open their server-provided url externally.
  return externalUrl
}

function makeExternal(url: string | null): EntityHref | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  return { href: trimmed, isExternal: true }
}
