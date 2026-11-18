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
