import type { EntitySearchHit } from '@/schemas/entity-search'

const MUNICIPALITY_PREFIX = /^(?:municipiul|municipiu|mun) /u
const UAT_PREFIX = /^(?:municipiul|municipiu|mun|orasul|oras|or|comuna|com) /u

function normalizeLocalityName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function uatLookupQuery(query: string): string | null {
  if (!/^[\p{L}\p{M}\s.'’-]+$/u.test(query)) return null
  const name = normalizeLocalityName(query)
  return name.replace(/ /g, '').length >= 3 ? name : null
}

export function rankUatSearchHits(
  query: string,
  hits: readonly EntitySearchHit[],
  uatCandidates: readonly EntitySearchHit[],
  limit: number,
): readonly EntitySearchHit[] {
  const matching = uatCandidates.flatMap((hit) => {
    if (hit.isUat !== true || hit.docType !== 'organization' || hit.isExternal || !hit.href.startsWith('/')) return []
    const title = normalizeLocalityName(hit.title)
    const locality = title.replace(UAT_PREFIX, '')
    if (!locality.startsWith(query)) return []
    const rank = locality === query ? 3 : MUNICIPALITY_PREFIX.test(title) ? 2 : 1
    return [{ hit, rank }]
  })
  const exact = matching.filter(({ rank }) => rank === 3).map(({ hit }) => hit)
  const bestPrefix = matching.sort((a, b) => b.rank - a.rank)[0]
  const preferred = exact.length > 0 ? exact : bestPrefix ? [bestPrefix.hit] : []
  if (preferred.length === 0) return hits

  const unique = new Map<string, EntitySearchHit>()
  for (const hit of [...preferred, ...hits]) {
    if (!unique.has(hit.id)) unique.set(hit.id, hit)
  }
  return [...unique.values()].slice(0, limit)
}
