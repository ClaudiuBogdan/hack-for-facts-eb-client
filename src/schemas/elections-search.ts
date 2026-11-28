import { z } from 'zod'
import { lazySchema, type LazyOutput } from '@/lib/route-contract'

/**
 * The `/alegeri` routes' URL contract: their search params, the keys and
 * offices they accept, and the vocabularies those share with the API's shapes
 * in `elections-catalog.ts` (which builds its schemas from them and
 * re-exports this module). Apart from it so that the route files, which every
 * page loads, carry only this; and lazy, so nothing here is built until an
 * `/alegeri` route is matched. See `docs/route-contracts.md`.
 */

/** The page size every list reads with: the API's own default, within its bound of 100. */
export const ELECTIONS_PAGE_SIZE = 20

/**
 * The last page these reads can ask for: GraphQL's largest `Int` (a signed
 * 32-bit integer; a larger page fails the request before the API reads it).
 * It is the tighter of the two bounds: the API's own, that `(page - 1) ×
 * pageSize` stay a safe integer, allows far more (`elections-catalog.test.ts`
 * keeps it so).
 */
export const ELECTIONS_MAX_PAGE = 2_147_483_647

/** The API's bound for an event or contest key. */
const MAX_KEY_LENGTH = 512

/** The type of place an office covers: a UAT (by SIRUTA), a county, the diaspora, or the country. */
export const ELECTION_PLACE_TYPES = ['uat', 'county', 'national', 'diaspora'] as const
export type ElectionPlaceType = (typeof ELECTION_PLACE_TYPES)[number]

/** The API's office grammar (`mayor`, `county_council`, a qualified `office:part`), within its length bound. */
const OFFICE = /^[a-z][a-z0-9_]*(?::[a-z0-9_]+)?$/u
const MAX_OFFICE_LENGTH = 64
/** A county code as the API filters by it (`CJ`, `B`). */
const COUNTY_CODE = /^[A-Z]{1,2}$/u
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u

/** The API's rule for an opaque value: non-empty, bounded, no control characters. Nothing else is checked or changed. */
function isOpaqueText(value: string, maxLength: number): boolean {
  // eslint-disable-next-line no-control-regex -- Rejecting control characters is the point.
  return value.length > 0 && value.length <= maxLength && !/[\u0000-\u001f\u007f]/u.test(value)
}

/** An event or contest key the API can look up. Any other key names no record: the page answers 404 without asking. */
export function isElectionRecordKey(value: string): boolean {
  return isOpaqueText(value, MAX_KEY_LENGTH)
}

/** An office the API's filter accepts. */
export function isElectionOffice(value: string): boolean {
  return value.length <= MAX_OFFICE_LENGTH && OFFICE.test(value)
}

const pageParam = () => z.number().int().min(1).max(ELECTIONS_MAX_PAGE).optional().catch(undefined)

/** `/alegeri`: the page. The API filters events by nothing else. */
export const electionsCatalogSearchSchema = lazySchema(() => z.object({ pagina: pageParam() }).catch({}))
export type ElectionsCatalogSearch = LazyOutput<typeof electionsCatalogSearchSchema>

export function parseElectionsCatalogSearch(search: unknown): ElectionsCatalogSearch {
  return electionsCatalogSearchSchema.parse(search ?? {})
}

/**
 * `/alegeri/$electionKey`: the ballot day by its date (its identity within
 * the event; none is the event's first day), then that day's contests by
 * office, place type and county, each one exact value the API accepts, and
 * the page.
 */
export const electionContestsSearchSchema = lazySchema(() =>
  z
    .object({
      data: z.string().regex(ISO_DATE).optional().catch(undefined),
      functie: z.string().refine(isElectionOffice).optional().catch(undefined),
      arie: z.enum(ELECTION_PLACE_TYPES).optional().catch(undefined),
      judet: z.string().regex(COUNTY_CODE).optional().catch(undefined),
      pagina: pageParam(),
    })
    .catch({}),
)
export type ElectionContestsSearch = LazyOutput<typeof electionContestsSearchSchema>

export function parseElectionContestsSearch(search: unknown): ElectionContestsSearch {
  return electionContestsSearchSchema.parse(search ?? {})
}

/**
 * `/alegeri/analize`: the view (`tip`), the section within it (`dupa`) and the
 * county (`judet`). The vocabularies are plain keys, so the route carries no
 * labels or icons; the page names them. Every key is returned, an unreadable
 * one as `undefined`: the root's search is merged under a child's, and a key
 * left out would keep its raw value. `partid` joins with the Partide view.
 */
export const ELECTIONS_ANALYTICS_VIEWS = {
  partide: ['timp', 'fise', 'castiguri', 'ponderi', 'clasament'],
  mandate: ['primarii', 'alegeri', 'consiliu', 'judete', 'consilieri'],
  harta: ['putere', 'schimbare', 'primarii', 'fluxuri', 'prezenta', 'diferente'],
  prezenta: ['timp', 'judete', 'localitati', 'strainatate', 'tip'],
  curse: ['diferente', 'stranse', 'candidati', 'tip'],
} as const
export type ElectionsAnalyticsView = keyof typeof ELECTIONS_ANALYTICS_VIEWS
export const ELECTIONS_ANALYTICS_VIEW_ORDER: readonly ElectionsAnalyticsView[] = ['partide', 'mandate', 'harta', 'prezenta', 'curse']
/** The view a bare address opens: the one drawn first. */
export const ELECTIONS_ANALYTICS_DEFAULT_VIEW: ElectionsAnalyticsView = 'mandate'

/** The 41 counties and București, by the codes the API writes. */
const COUNTY_CODES: readonly string[] = [
  'AB', 'AR', 'AG', 'BC', 'BH', 'BN', 'BT', 'BR', 'BV', 'B', 'BZ', 'CL', 'CS', 'CJ', 'CT', 'CV', 'DB', 'DJ', 'GL', 'GR', 'GJ',
  'HR', 'HD', 'IL', 'IS', 'IF', 'MM', 'MH', 'MS', 'NT', 'OT', 'PH', 'SJ', 'SM', 'SB', 'SV', 'TR', 'TM', 'TL', 'VL', 'VS', 'VN',
]

export type ElectionsAnalyticsSearch = {
  readonly tip: ElectionsAnalyticsView | undefined
  readonly dupa: string | undefined
  readonly judet: string | undefined
}

const isView = (value: unknown): value is ElectionsAnalyticsView => typeof value === 'string' && Object.prototype.hasOwnProperty.call(ELECTIONS_ANALYTICS_VIEWS, value)

export function parseElectionsAnalyticsSearch(search: unknown): ElectionsAnalyticsSearch {
  const raw = (search ?? {}) as Record<string, unknown>
  const tip = isView(raw.tip) ? raw.tip : undefined
  const tabs: readonly string[] = ELECTIONS_ANALYTICS_VIEWS[tip ?? ELECTIONS_ANALYTICS_DEFAULT_VIEW]
  const dupa = typeof raw.dupa === 'string' && tabs.includes(raw.dupa) ? raw.dupa : undefined
  const judet = typeof raw.judet === 'string' && COUNTY_CODES.includes(raw.judet) ? raw.judet : undefined
  return { tip, dupa, judet }
}
