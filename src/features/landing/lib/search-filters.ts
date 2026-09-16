import type { LucideIcon } from 'lucide-react'
import { Building2, HeartHandshake, Landmark, MapPin, Scale, Factory, Sprout, Tag } from 'lucide-react'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'
import vocabulary from '@/assets/entity-tags.json'
import type { EntitySearchInput } from '@/schemas/entity-search'

/** Scope chips are sent to the server before ranking/pagination.
 * One identity scope at a time; PNRR is an independent role qualifier.
 */

export type SearchFilterId =
  | 'company'
  | 'ngo'
  | 'legal_act'
  | 'public_enterprise'
  | 'organization'
  | 'uat'
  | 'pnrr'
  | `tag:${string}`
  | `exclude-tag:${string}`

export type SearchFilter = {
  readonly id: SearchFilterId
  readonly entityTag?: string
  readonly exclude?: boolean
  /**
   * The chip. Plural, because it names a scope rather than a kind. A `msg`
   * descriptor resolved at render, since this vocabulary is module state and
   * the server process answers every locale.
   */
  readonly label: MessageDescriptor
  /** One clause under the suggestion, saying what the chip keeps. */
  readonly hint: MessageDescriptor
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
}

export const SEARCH_FILTERS: readonly SearchFilter[] = [
  {
    id: 'uat',
    label: msg`Primării`,
    hint: msg`municipii, orașe, comune și sectoare`,
    Icon: MapPin,
    triggers: [
      'primarie', 'primaria', 'primarii', 'primariile', 'primariei',
      'uat', 'uaturi', 'uat-uri', 'uat-urile',
      'comuna', 'comunei', 'comune', 'comunele',
      'oras', 'orasul', 'orasului', 'orase', 'orasele',
      'municipiu', 'municipiul', 'municipiului', 'municipii', 'municipiile',
      'sector', 'sectorul', 'sectoare',
    ],
    // Server-side isUat now preserves recall without the category word.
    absorb: true,
  },
  {
    id: 'organization',
    label: msg`Instituții`,
    hint: msg`orice entitate publică, inclusiv primăriile`,
    Icon: Landmark,
    triggers: ['institutie', 'institutia', 'institutii', 'institutiile', 'institutiei'],
    // In titles (INSTITUTIA PREFECTULUI …); and `cluj` alone finds no institution.
    absorb: false,
  },
  {
    id: 'company',
    label: msg`Firme`,
    hint: msg`societăți comerciale private`,
    Icon: Building2,
    triggers: [
      'firma', 'firme', 'firmei', 'firmele',
      'societate', 'societatea', 'societati', 'societatile',
      'companie', 'compania', 'companii', 'companiile',
      'srl', 's.r.l', 's.r.l.',
    ],
    // No synonym, no name: `firma dedeman` finds FIRMA SRL, `dedeman` finds Dedeman.
    absorb: true,
  },
  {
    id: 'public_enterprise',
    label: msg`Companii de stat`,
    hint: msg`întreprinderi publice și regii`,
    Icon: Factory,
    triggers: ['regie', 'regia', 'regii', 'intreprindere', 'intreprinderea', 'intreprinderi', 'intreprinderile'],
    // In titles: REGIA NATIONALA A PADURILOR, INTREPRINDEREA …
    absorb: false,
  },
  {
    id: 'ngo',
    label: msg`ONG-uri`,
    hint: msg`asociații și fundații`,
    Icon: HeartHandshake,
    triggers: [
      'ong', 'onguri', 'ong-uri', 'ong-urile',
      'asociatie', 'asociatia', 'asociatii', 'asociatiile',
      'fundatie', 'fundatia', 'fundatii', 'fundatiile',
    ],
    // `ong` expands to asociatia/fundatia in the palette; `ong cluj` finds six NGOs, `cluj` none.
    absorb: false,
  },
  {
    id: 'legal_act',
    label: msg`Legislație`,
    hint: msg`legi, hotărâri și ordonanțe`,
    Icon: Scale,
    triggers: [
      'lege', 'legea', 'legi', 'legile', 'legislatie', 'legislatia',
      'hotarare', 'hotararea', 'hotarari', 'hg',
      'ordonanta', 'ordonante', 'oug', 'og',
    ],
    // Acts are titled by their descriptive name and carry the citation as an
    // identifier, so `227/2015` alone still finds the Fiscal Code.
    absorb: true,
  },
  {
    id: 'pnrr',
    label: msg`PNRR`,
    hint: msg`beneficiari ai Planului Național de Redresare`,
    Icon: Sprout,
    triggers: ['pnrr'],
    // `pnrr cluj` returns nothing at all; the word is not in any title.
    absorb: true,
  },
]

// Curated Romanian inflections for common intentions. Every other tag is
// discoverable by its complete vocabulary label or namespaced tag string.
const TAG_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  'kind::school': ['scoala', 'scoli', 'scolile', 'scolii'],
  'kind::hospital': ['spital', 'spitalul', 'spitale', 'spitalului'],
  'kind::university': ['universitate', 'universitatea', 'universitati'],
  'kind::school::highschool': ['liceu', 'liceul', 'licee'],
  'kind::school::kindergarten': ['gradinita', 'gradinite'],
  'kind::school::nursery': ['cresa', 'crese'],
}

export function tagSearchFilters(locale: string): readonly SearchFilter[] {
  return vocabulary.facets.flatMap(facet => facet.tags.flatMap(tag => {
    const label = locale === 'ro' ? tag.labelRo : tag.labelEn
    const facetLabel = locale === 'ro' ? facet.labelRo : facet.labelEn
    const triggers = [...new Set([tag.tag, foldToken(label), ...(TAG_KEYWORDS[tag.tag] ?? [])])]
    return [false, true].map(exclude => ({
      id: `${exclude ? 'exclude-tag' : 'tag'}:${tag.tag}` as SearchFilterId,
      entityTag: tag.tag, exclude,
      label: { id: `search-tag-${locale}-${exclude ? 'exclude-' : ''}${tag.tag}`, message: `${exclude ? '− ' : ''}${facetLabel}: ${label}` },
      hint: exclude ? msg`Exclude entitățile cu această etichetă` : msg`Filtrează entitățile publice după etichetă`,
      Icon: Tag,
      triggers: exclude ? triggers.map(trigger => `-${trigger}`) : triggers,
      absorb: true,
    }))
  }))
}

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

function matchingTokenIndexes(tokens: readonly string[], triggers: readonly string[]): Set<number> {
  const matches = new Set<number>()
  for (const trigger of triggers) {
    const parts = trigger.split(/\s+/u)
    for (let start = 0; start <= tokens.length - parts.length; start++) {
      if (parts.every((part, index) => tokenMatches(tokens[start + index], part, start + index === tokens.length - 1))) {
        for (let index = 0; index < parts.length; index++) matches.add(start + index)
      }
    }
  }
  return matches
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
  tagFilters: readonly SearchFilter[] = [],
): readonly SearchFilter[] {
  const tokens = term.trim().split(/\s+/u).filter(Boolean).map(foldToken)
  if (tokens.length === 0) return []
  const activeIds = new Set(active.map((filter) => filter.id))

  return [...SEARCH_FILTERS, ...tagFilters].filter((filter) => {
    if (activeIds.has(filter.id)) return false
    return matchingTokenIndexes(tokens, filter.triggers).size > 0
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
  // The number alone is too short and loses the meaningful sector name.
  if (filter.id === 'uat' && /\bsector(?:ul)?\s+[1-6]\b/iu.test(term)) return term
  const words = term.trim().split(/\s+/u).filter(Boolean)
  const matches = matchingTokenIndexes(words.map(foldToken), filter.triggers)
  const kept = words.filter((_word, index) => !matches.has(index))
  return kept.join(' ')
}

/** Translate the selected scope and independent PNRR qualifier to API filters. */
export function searchFilterInput(filters: readonly SearchFilter[]): Partial<EntitySearchInput> {
  const scope = filters.find(filter => !filter.entityTag && filter.id !== 'pnrr')?.id
  const roles = filters.some(filter => filter.id === 'pnrr') ? ['pnrr_entity'] : []
  // A public enterprise can have organization as its primary identity. Roles
  // preserve those matches. The UI keeps the two role scopes exclusive.
  if (scope === 'public_enterprise') roles.push('public_enterprise')
  const entityTags = filters.filter(filter => filter.entityTag && !filter.exclude).map(filter => filter.entityTag!)
  const excludeEntityTags = filters.filter(filter => filter.entityTag && filter.exclude).map(filter => filter.entityTag!)
  return {
    ...(entityTags.length > 0 && { entityTags }),
    ...(excludeEntityTags.length > 0 && { excludeEntityTags }),
    ...(scope && scope !== 'public_enterprise' && { docTypes: [scope === 'uat' ? 'organization' : scope] }),
    ...(scope === 'uat' && { isUat: true }),
    ...(roles.length && { roles }),
  }
}

/**
 * `Firme` · `Firme și PNRR` · `Firme, PNRR și Instituții` — how a scope is read
 * out. Takes the labels already resolved to the reader's language, and the
 * conjunction in that language, so this stays pure and the caller owns i18n.
 */
export function describeScope(labels: readonly string[], conjunction: string): string {
  if (labels.length <= 1) return labels[0] ?? ''
  return `${labels.slice(0, -1).join(', ')} ${conjunction} ${labels[labels.length - 1]}`
}
