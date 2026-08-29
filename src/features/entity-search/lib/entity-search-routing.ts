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
 *   public_enterprise   /intreprinderi-publice/$cui (internal, cuis[0])
 *   ngo                 /ong-uri/$cui            (internal, cuis[0])
 *   member              /parlament/membri/$id    (internal, best-effort docId)
 *   bill                /parlament/proiecte/$id  (internal, best-effort docId)
 *   committee           /parlament/comisii/$id   (internal, docKey = committee_key)
 *   legal_act           /legislation/acts/$id    (internal, docId = act_id)
 *   mo_act              url                      (external, new tab)
 *   pnrr_project        url                      (external, new tab)
 *   pnrr_entity         url                      (external, new tab)
 *   procurement_*       /procurement/.../$id       (internal, best-effort docId)
 *
 * When no usable target can be built (e.g. a CUI-spine hit with no `cuis`, or an
 * interim hit with no `url`), `entityHref` returns `null` so the component can
 * render the row as non-clickable rather than linking to a broken `#`.
 */
import { normalizeNgoCui } from '@/features/ngos/lib/normalize-ngo-cui'
import { normalizePublicEnterpriseCui } from '@/features/public-enterprises/lib/normalize-public-enterprise-cui'

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

type RouteBuilder = (id: string) => string | null

/** CUI-spine doc types route to an internal profile page via `cuis[0]`. */
const CUI_SPINE_ROUTES: Readonly<Record<string, RouteBuilder>> = {
  company: (cui) => `/companies/${encodeURIComponent(cui)}`,
  organization: (cui) => `/entities/${encodeURIComponent(cui)}`,
  public_enterprise: (cui) => {
    const normalized = normalizePublicEnterpriseCui(cui)
    return normalized
      ? `/intreprinderi-publice/${encodeURIComponent(normalized)}`
      : null
  },
  ngo: (cui) => {
    const normalized = normalizeNgoCui(cui)
    return normalized ? `/ong-uri/${encodeURIComponent(normalized)}` : null
  },
}

/** Parliament doc types route internally off their `docId`, best-effort. */
const DOC_ID_ROUTES: Readonly<Record<string, RouteBuilder>> = {
  member: (id) => `/parlament/membri/${encodeURIComponent(id)}`,
  bill: (id) => `/parlament/proiecte/${encodeURIComponent(id)}`,
  // `committee` had a badge but NO route, so every committee hit fell through to
  // its `url` and sent the user to cdep.ro — for a page we host ourselves. The
  // palette's `doc_key` IS `parliament.committees.committee_key` (e.g.
  // `cdep:1:1990:63`), the same value `parliament-committees-page` passes as
  // `params.committeeKey`. Measured 2026-08-26: all 700 committees carry a
  // source_url, so this turns an external link into an internal one rather than
  // fixing a dead row (SEARCH_LAYER_REVIEW_2026-08-25.md F15).
  committee: (id) => `/parlament/comisii/${encodeURIComponent(id)}`,
  legal_act: (id) => `/legislation/acts/${encodeURIComponent(id)}`,
  procurement_contract: (id) => `/procurement/contracts/${encodeURIComponent(id)}`,
  procurement_procedure: (id) => `/procurement/procedures/${encodeURIComponent(id)}`,
  procurement_direct_acquisition: (id) =>
    `/procurement/direct-acquisitions/${encodeURIComponent(id)}`,
}

function firstNonEmpty(values: readonly string[]): string | null {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

function firstInternalId(hit: EntityRoutingInput): string | null {
  return firstNonEmpty([hit.docId ?? '', hit.docKey ?? ''])
}

/**
 * Compute the deep-link for a hit. Returns `null` when no usable target exists.
 *
 * Resolution order per doc type:
 * - CUI-spine: internal route from `cuis[0]`; if no CUI, fall back to `url`.
 * - doc-id routes: internal route from `docId`/`docKey`; if no id, fall back to `url`.
 * - interim/unknown: external `url`.
 */
export function entityHref(hit: EntityRoutingInput): EntityHref | null {
  const externalUrl = makeExternal(hit.url)

  const cuiRoute = CUI_SPINE_ROUTES[hit.docType]
  if (cuiRoute) {
    const cui = firstNonEmpty(hit.cuis)
    if (cui) {
      const href = cuiRoute(cui)
      if (href) return { href, isExternal: false }
    }
    return externalUrl
  }

  const docIdRoute = DOC_ID_ROUTES[hit.docType]
  if (docIdRoute) {
    const id = firstInternalId(hit)
    if (id) {
      const href = docIdRoute(id)
      if (href) return { href, isExternal: false }
    }
    return externalUrl
  }

  // Remaining interim types (mo_act, pnrr_*) and any unknown doc type open their
  // server-provided url externally.
  return externalUrl
}

function makeExternal(url: string | null): EntityHref | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  return { href: trimmed, isExternal: true }
}
