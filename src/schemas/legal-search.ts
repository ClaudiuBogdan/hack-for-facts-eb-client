import { z } from 'zod'
import { lazySchema, type LazyOutput } from '@/lib/route-contract'

/**
 * The `/legislation` routes' URL contract: their search params, and the closed
 * vocabularies those share with the data schemas in `legal.ts` (which builds its
 * enums from the same lists and re-exports this module).
 *
 * Apart from `legal.ts` so that the route files, which every page loads, carry
 * only this; and lazy, so nothing here is built until a `/legislation` route is
 * matched. See `docs/route-contracts.md`.
 */

/** `legal.acts.status` — the closed 7-value fold vocabulary. */
export const LEGAL_ACT_STATUSES = [
  'in-vigoare',
  'modificat',
  'abrogat',
  'abrogat-partial',
  'suspendat',
  'iesit-din-vigoare',
  'necunoscut',
] as const

/** `legal.document_summaries.domains` — the controlled 16-value vocabulary. */
export const LEGAL_DOMAIN_SLUGS = [
  'administratie',
  'fiscal-si-bugetar',
  'justitie',
  'economie-si-comert',
  'munca-si-protectie-sociala',
  'proprietate-si-urbanism',
  'sanatate',
  'aparare-si-securitate',
  'transport',
  'educatie',
  'mediu',
  'agricultura',
  'energie',
  'cultura',
  'telecomunicatii-si-digital',
  'altele',
] as const

/**
 * `MoPartCode` — the eight gazette parts the server serves. `PIM` is Partea I
 * in Hungarian, a real part code with issues from 2008 on (verified live
 * 2026-08-26: 113 issues in 2010, 22 in 2026).
 */
export const GAZETTE_PART_CODES = ['PI', 'PIM', 'PII', 'PIII', 'PIV', 'PV', 'PVI', 'PVII'] as const

/**
 * `legal.act_status_events.event_kind` — the DB CHECK vocabulary (12 values,
 * `act_status_events_kind_check`). Closed at the database, so the FILTER param
 * may be an enum; the ROW field stays an open string (`legalRecentChangeSchema`)
 * so a 13th kind added upstream degrades to a prettified label instead of
 * breaking the page. Census 2026-08-26 (sums to the feed's 84.484):
 * modificare 29.985 · abrogare-totala 27.930 · completare 10.191 ·
 * promulgare 9.310 · abrogare-partiala 2.052 · aprobare-oug 1.799 ·
 * republicare 1.325 · aprobare-og 867 · rectificare 419 · suspendare 344 ·
 * iesire-din-vigoare 262 · incetare-suspendare 0 (in the CHECK, no rows yet).
 */
export const LEGAL_EVENT_KINDS = [
  'abrogare-totala',
  'abrogare-partiala',
  'modificare',
  'completare',
  'suspendare',
  'incetare-suspendare',
  'republicare',
  'rectificare',
  'iesire-din-vigoare',
  'promulgare',
  'aprobare-oug',
  'aprobare-og',
] as const

/**
 * `act_status_events.event_source` — which pipeline recorded the event. The
 * server surfaces it deliberately and never merges the two (12.790 of 84.484
 * events are `monitorul-oficial`, measured 2026-08-26); the UI shows it on
 * every row. Enum for the FILTER param only — rows carry an open string.
 */
export const LEGAL_EVENT_SOURCES = ['portal', 'monitorul-oficial'] as const

/**
 * The fields the acts directory filters by: the server's filter
 * (`legalActsBrowseFilterSchema` in `legal.ts`) and the directory's URL state
 * below are both built from it. A function, so nothing is built until called.
 */
export const legalActsBrowseFilterShape = () => ({
  actType: z.string().optional(),
  year: z.number().int().optional(),
  status: z.enum(LEGAL_ACT_STATUSES).optional(),
  domain: z.enum(LEGAL_DOMAIN_SLUGS).optional(),
})

/**
 * Act page search params (`/legislation/acts/$actId` — the text lives ON the
 * act page; the old `/text` sibling 301-redirects here).
 *  - `doc` — read a specific (non-canonical) expression instead of the act's
 *    canonical document.
 *  - `nod` — a `document_nodes` PATH deep link (never a node id: ids are
 *    recompile-scoped). A search param, not a hash, so the SSR loader can
 *    target the chunk containing it on giant documents.
 */
export const legalReaderSearchSchema = lazySchema(() =>
  z.object({
    // The router JSON-parses search values: `?doc=54260` arrives as a number and
    // `?doc=%2254260%22` as a string. Both name the same document id.
    doc: z
      .union([z.string().min(1), z.number().int().nonnegative()])
      .transform((value) => String(value))
      .optional()
      .catch(undefined),
    nod: z.string().min(1).optional(),
  }),
)
export type LegalReaderSearch = LazyOutput<typeof legalReaderSearchSchema>

/**
 * The directory's URL state. `status` additionally admits the sentinel
 * `'toate'`: an absent status DEFAULTS to `in-vigoare` (law in force is what
 * people mean by "the acts"), so "no status filter" must be a stated choice
 * in the URL, never the silent fallback.
 */
export const legalActsBrowseSearchSchema = lazySchema(() =>
  z.object(legalActsBrowseFilterShape()).extend({
    status: z.enum(LEGAL_ACT_STATUSES).or(z.literal('toate')).optional(),
  }),
)
export type LegalActsBrowseSearch = LazyOutput<typeof legalActsBrowseSearchSchema>

/**
 * URL state for `/legislation/gazette` — filters plus the server's own page
 * number, so a filtered page is a shareable link. `.catch(undefined)` drops a
 * malformed param to its default instead of erroring the route; the year's
 * corpus bounds are enforced by the component (the valid range is a measured
 * constant in `legal-coverage.ts`, which schemas do not import).
 */
export const gazetteBrowseSearchSchema = lazySchema(() =>
  z.object({
    year: z.number().int().optional().catch(undefined),
    part: z.enum(GAZETTE_PART_CODES).optional().catch(undefined),
    page: z.number().int().min(1).optional().catch(undefined),
  }),
)
export type GazetteBrowseSearch = LazyOutput<typeof gazetteBrowseSearchSchema>

/**
 * A calendar-valid `YYYY-MM-DD`. The round-trip guards V8's lenient parse:
 * '2026-02-31' does NOT parse to NaN — it rolls over to March 3rd — and the
 * server rejects such a date as invalid input, so the URL schema must drop it
 * rather than forward it into an erroring request.
 */
const changesFeedDate = () =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const parsed = Date.parse(value)
      return !Number.isNaN(parsed) && new Date(parsed).toISOString().slice(0, 10) === value
    })

/**
 * URL state for `/legislation/changes`. `.catch(undefined)` drops a malformed
 * param to its default instead of erroring the route (gazette pattern).
 *
 * `view` names the feed's cohorts — the effective-date dimension has real
 * populations a bare window cannot reach (measured 2026-08-26):
 *  - absent (default): already-in-force events, `until = today` (63.210);
 *  - `viitoare`: future-dated events, `since = tomorrow` (8);
 *  - `toate`: the feed exactly as served — future first, undated trailing;
 *  - `nedatate`: the 21.266 events with NO effective date (`undatedOnly`),
 *    which every since/until window excludes.
 * An explicit `since`/`until` is the custom-window mode; when a hand-edited
 * URL carries BOTH a `view` and a window, the component lets `view` win and
 * never sends the rejected `undatedOnly`+window combination to the server.
 */
export const legalChangesSearchSchema = lazySchema(() =>
  z.object({
    view: z.enum(['viitoare', 'toate', 'nedatate']).optional().catch(undefined),
    since: changesFeedDate().optional().catch(undefined),
    until: changesFeedDate().optional().catch(undefined),
    kind: z.enum(LEGAL_EVENT_KINDS).optional().catch(undefined),
    source: z.enum(LEGAL_EVENT_SOURCES).optional().catch(undefined),
  }),
)
export type LegalChangesSearch = LazyOutput<typeof legalChangesSearchSchema>

/**
 * URL state for `/legislation/search` — the Caută tab, so a search is a
 * shareable link. TanStack Router JSON-parses search params, so a
 * numeric-looking `q` (`?q=227`) arrives as a NUMBER — coerce it back to text
 * rather than dropping a legitimate query, but treat `null` as junk
 * (`z.coerce.string()` alone would turn `?q=null` into the literal text
 * "null" and search for it); the same trap and cure as `entity-search.ts`'s
 * `optionalSearchString`. A boolean is the word the reader typed: the router
 * writes the text "true" as `?q=%22true%22`, so a bare `?q=true` comes from the
 * page's native form (SEARCH-001) and is kept as "true" (review
 * astra-client-11). A number's spelling is lost before this schema runs
 * (`?q=1.10` arrives as 1.1), which only the shared codec could keep.
 *
 * `historical: true` widens the search to abrogated / out-of-force acts (the
 * server's `includeHistorical`, default false — which silently zeroes even an
 * exact-citation lookup of a repealed law). Only `true` is a stored value:
 * the default is URL-absence, so `?historical=false` and junk both drop.
 */
/**
 * One of the finder's filter keys: text, a number read as text, anything else dropped. Built on use. The bound
 * holds every value of the longest vocabulary at once (the 16 domains join to 228 characters), so choosing them
 * all never drops the key and widens the search (review astra-client-7, F6).
 */
const finderKey = () =>
  z.preprocess((value) => (typeof value === 'number' ? String(value) : value), z.string().min(1).max(1000).optional()).catch(undefined)

export const legalFinderSearchSchema = lazySchema(() =>
  z.object({
    q: z
      .preprocess(
        (value) => (value === null ? undefined : typeof value === 'boolean' ? String(value) : value),
        z.coerce.string().min(1).max(400).optional(),
      )
      .catch(undefined),
    historical: z.literal(true).optional().catch(undefined),
    // The filters (owner, 25 November 2026), read and checked against their vocabularies by
    // `features/legal/lib/search-filters.ts`; here only kept as text (the router may hand a year over as a
    // number) and dropped when unreadable.
    stare: finderKey(),
    tip: finderKey(),
    an: finderKey(),
    domeniu: finderKey(),
    categorie: finderKey(),
    sanctiuni: z.literal(true).optional().catch(undefined),
  }),
)
export type LegalFinderSearch = LazyOutput<typeof legalFinderSearchSchema>
