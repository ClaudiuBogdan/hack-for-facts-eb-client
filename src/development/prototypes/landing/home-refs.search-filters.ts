import type { LucideIcon } from 'lucide-react'
import { Building2, HeartHandshake, Landmark, MapPin, Scale, Factory, Sprout } from 'lucide-react'
import type { EntitySearchHit } from '@/schemas/entity-search'

/**
 * Filter suggestions for the landing search — Gmail's labels, for entities.
 *
 * A reader who types `firma dedeman` has said two things: what they are looking
 * for, and what kind of thing it is. This module recognises the second, offers
 * it back as a chip, and decides what the chip does to the text and to the
 * rows. Nothing here touches React.
 *
 * **Whether the word leaves the text is decided per filter, from the data.**
 * `firma` is in no company's name and has no synonym in the palette; left in
 * the query it matches companies literally called FIRMA, and the chip lifting
 * it out is what turns `firma dedeman` into a search for Dedeman. `primaria` is
 * the opposite case. The palette expands it through a synonym list
 * (`municipiul`, `orasul`, `comuna`, `uat`), and that expansion is the *only*
 * reason MUNICIPIUL CLUJ-NAPOCA answers `primaria cluj` at all — measured
 * 2026-09-10 against the dev API: `primaria cluj` puts the municipality first;
 * `cluj` alone returns fifty companies named CLUJ-something and not one UAT.
 * So for `primaria` the word stays and the chip narrows; absorbing it would
 * have made the headline query return nothing. `ong` is the same (`ong cluj`
 * finds six NGOs, `cluj` finds none), and `regia`, `institutia` are in titles.
 * The flag is `absorb`, and the reason for each value is beside it.
 *
 * **Filters are applied on the client, over the page the server returned.**
 * The API already accepts `docTypes` and `roles`, and the palette knows which
 * organisations are UATs (`core.public_entities.is_uat`, which it reads for
 * ranking and writes into the display subtitle) — but the UAT flag is not yet a
 * filterable attribute, and the decision for this pass was to send no filters
 * at all until that lands and the whole set can be moved server-side together.
 * Until then a chip narrows the first `SEARCH_LIMIT` hits and says so when it
 * has narrowed them to nothing. `matches` is the seam: when the API carries the
 * filter, each predicate becomes an argument and the row-level check goes away.
 *
 * **Triggers are category words, not name words.** `spital`, `minister` and
 * `scoala` describe a kind but are the names of the things themselves, and no
 * chip here narrows to hospitals or ministries, so offering one on those words
 * would only put a wrong chip in the reader's way. A word earns a place here
 * only if there is a chip that means what the word means.
 */

export type SearchFilterId =
  | 'company'
  | 'ngo'
  | 'legal_act'
  | 'public_enterprise'
  | 'organization'
  | 'uat'
  | 'pnrr'

export type SearchFilter = {
  readonly id: SearchFilterId
  /** The chip. Plural, because it names a scope rather than a kind. */
  readonly label: string
  /** One clause under the suggestion, saying what the chip keeps. */
  readonly hint: string
  readonly Icon: LucideIcon
  /**
   * Folded, diacritic-free forms a reader might type. Whole words only —
   * matching is by token, never by substring, so `firma` cannot fire inside
   * `confirmare`. Inflections are spelled out rather than stemmed because a
   * Romanian stemmer is more code than this list and gets `legi`/`lege` wrong.
   */
  readonly triggers: readonly string[]
  /**
   * Whether accepting the chip lifts the matched word out of the text. True
   * only where the word does no work in the query — see the module comment.
   */
  readonly absorb: boolean
  /** Whether a hit belongs in this scope. */
  readonly matches: (hit: EntitySearchHit) => boolean
}

const byDocType = (docType: string) => (hit: EntitySearchHit) => hit.docType === docType

/**
 * The palette writes `entity_type, category` into an organisation's subtitle —
 * `uat, uat_municipality`, `uat, uat_county`, `uat, uat_commune` — so the UAT
 * flag is recoverable from the display line for now. That is a projection
 * detail rather than a contract, and it is the first predicate to replace once
 * `is_uat` is filterable; the test on this module is what will notice if the
 * subtitle format moves first.
 */
const isUat = (hit: EntitySearchHit) =>
  hit.docType === 'organization' && /^uat\b/iu.test(hit.subtitle ?? '')

export const SEARCH_FILTERS: readonly SearchFilter[] = [
  {
    id: 'uat',
    label: 'Primării',
    hint: 'municipii, orașe, comune și județe',
    Icon: MapPin,
    triggers: [
      'primarie', 'primaria', 'primarii', 'primariile', 'primariei',
      'uat', 'uaturi', 'uat-uri', 'uat-urile',
      'comuna', 'comunei', 'comune', 'comunele',
      'oras', 'orasul', 'orasului', 'orase', 'orasele',
      'municipiu', 'municipiul', 'municipiului', 'municipii', 'municipiile',
      'judet', 'judetul', 'judetului', 'judete', 'judetele',
    ],
    // The palette's synonym on `primaria` is what finds the municipality.
    absorb: false,
    matches: isUat,
  },
  {
    id: 'organization',
    label: 'Instituții',
    hint: 'orice entitate publică, inclusiv primăriile',
    Icon: Landmark,
    triggers: ['institutie', 'institutia', 'institutii', 'institutiile', 'institutiei'],
    // In titles (INSTITUTIA PREFECTULUI …); and `cluj` alone finds no institution.
    absorb: false,
    matches: byDocType('organization'),
  },
  {
    id: 'company',
    label: 'Firme',
    hint: 'societăți comerciale private',
    Icon: Building2,
    triggers: [
      'firma', 'firme', 'firmei', 'firmele',
      'societate', 'societatea', 'societati', 'societatile',
      'companie', 'compania', 'companii', 'companiile',
      'srl', 's.r.l', 's.r.l.',
    ],
    // No synonym, no name: `firma dedeman` finds FIRMA SRL, `dedeman` finds Dedeman.
    absorb: true,
    matches: byDocType('company'),
  },
  {
    id: 'public_enterprise',
    label: 'Companii de stat',
    hint: 'întreprinderi publice și regii',
    Icon: Factory,
    triggers: ['regie', 'regia', 'regii', 'intreprindere', 'intreprinderea', 'intreprinderi', 'intreprinderile'],
    // In titles: REGIA NATIONALA A PADURILOR, INTREPRINDEREA …
    absorb: false,
    matches: byDocType('public_enterprise'),
  },
  {
    id: 'ngo',
    label: 'ONG-uri',
    hint: 'asociații și fundații',
    Icon: HeartHandshake,
    triggers: [
      'ong', 'onguri', 'ong-uri', 'ong-urile',
      'asociatie', 'asociatia', 'asociatii', 'asociatiile',
      'fundatie', 'fundatia', 'fundatii', 'fundatiile',
    ],
    // `ong` expands to asociatia/fundatia in the palette; `ong cluj` finds six NGOs, `cluj` none.
    absorb: false,
    matches: byDocType('ngo'),
  },
  {
    id: 'legal_act',
    label: 'Legislație',
    hint: 'legi, hotărâri și ordonanțe',
    Icon: Scale,
    triggers: [
      'lege', 'legea', 'legi', 'legile', 'legislatie', 'legislatia',
      'hotarare', 'hotararea', 'hotarari', 'hg',
      'ordonanta', 'ordonante', 'oug', 'og',
    ],
    // Acts are titled by their descriptive name and carry the citation as an
    // identifier, so `227/2015` alone still finds the Fiscal Code.
    absorb: true,
    matches: byDocType('legal_act'),
  },
  {
    id: 'pnrr',
    label: 'PNRR',
    hint: 'beneficiari ai Planului Național de Redresare',
    Icon: Sprout,
    triggers: ['pnrr'],
    // `pnrr cluj` returns nothing at all; the word is not in any title.
    absorb: true,
    matches: (hit) => hit.roles.includes('pnrr_entity'),
  },
]

const FILTER_BY_ID = new Map(SEARCH_FILTERS.map((filter) => [filter.id, filter]))

export function getSearchFilter(id: SearchFilterId): SearchFilter {
  const filter = FILTER_BY_ID.get(id)
  if (!filter) throw new Error(`Unknown search filter: ${id}`)
  return filter
}

/** Lower-case, diacritics stripped — the same fold the match marks use. */
function foldToken(token: string): string {
  return token.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/**
 * A word must be this long before it is allowed to match as a prefix of a
 * trigger. Below it, `pri` would offer Primării to someone typing `Primăvara`
 * on every keystroke that got there.
 */
const PREFIX_MIN_CHARS = 4

/**
 * Whether a typed token matches a trigger.
 *
 * Only the word under the caret — the last one — may match as a prefix, since
 * it is the only one still being typed. `firm` at the end offers Firme; `firm`
 * in the middle of a query is a word the reader has finished and did not mean
 * as `firma`.
 */
function tokenMatches(token: string, trigger: string, isLast: boolean): boolean {
  if (token === trigger) return true
  return isLast && token.length >= PREFIX_MIN_CHARS && trigger.startsWith(token)
}

/**
 * Which filters the typed text is asking for, in vocabulary order.
 *
 * Filters already applied are not offered again, and a filter is offered at
 * most once however many of its triggers appear.
 */
export function suggestFilters(
  term: string,
  active: readonly SearchFilter[] = [],
): readonly SearchFilter[] {
  const tokens = term.trim().split(/\s+/u).filter(Boolean).map(foldToken)
  if (tokens.length === 0) return []
  const activeIds = new Set(active.map((filter) => filter.id))

  return SEARCH_FILTERS.filter((filter) => {
    if (activeIds.has(filter.id)) return false
    return tokens.some((token, index) =>
      filter.triggers.some((trigger) => tokenMatches(token, trigger, index === tokens.length - 1)),
    )
  })
}

/**
 * The query with the words that earned a filter lifted out of it — for a
 * filter that absorbs. For one that does not, the query comes back untouched.
 *
 * Works on the original string so the reader's own spelling and diacritics
 * survive in what remains; only the matched words go. Whitespace is collapsed
 * because two spaces where a word was is the kind of thing that makes a field
 * look broken.
 */
export function absorbTriggers(term: string, filter: SearchFilter): string {
  if (!filter.absorb) return term
  const words = term.trim().split(/\s+/u).filter(Boolean)
  const kept = words.filter((word, index) => {
    const token = foldToken(word)
    return !filter.triggers.some((trigger) => tokenMatches(token, trigger, index === words.length - 1))
  })
  return kept.join(' ')
}

/** Hits that every active filter keeps. No filters keeps everything. */
export function narrowHits(
  hits: readonly EntitySearchHit[],
  filters: readonly SearchFilter[],
): readonly EntitySearchHit[] {
  if (filters.length === 0) return hits
  return hits.filter((hit) => filters.every((filter) => filter.matches(hit)))
}

/** `Firme` · `Firme și PNRR` · `Firme, PNRR și Instituții` — how a scope is read out. */
export function describeScope(filters: readonly SearchFilter[]): string {
  const labels = filters.map((filter) => filter.label)
  if (labels.length <= 1) return labels[0] ?? ''
  return `${labels.slice(0, -1).join(', ')} și ${labels[labels.length - 1]}`
}
