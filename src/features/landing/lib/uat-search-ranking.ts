import { entityHref } from '@/features/entity-search/lib/entity-search-routing'
import { countyNameRo } from '@/lib/territory-counties'
import type { EntitySearchHit } from '@/schemas/entity-search'

type UatKind = 'commune' | 'town' | 'municipality' | 'sector'
export type UatDirectoryRow = readonly [cui: string, name: string, county: string, kind: UatKind]

type IndexedUat = {
  readonly row: UatDirectoryRow
  readonly searchName: string
}

const TITLE_PREFIX: Record<UatKind, string> = {
  commune: 'Comuna ',
  town: 'Orașul ',
  municipality: 'Municipiul ',
  sector: '',
}

function normalizeLocalityName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function uatLookupQuery(query: string): string | null {
  if (!/^[\p{L}\p{M}\p{N}\s.'’-]+$/u.test(query)) return null
  const name = normalizeLocalityName(query)
  return name.replace(/[^\p{L}]/gu, '').length >= 3 ? name : null
}

export function indexUatSearchDirectory(rows: readonly UatDirectoryRow[]): readonly IndexedUat[] {
  return rows.map(row => ({ row, searchName: normalizeLocalityName(row[1]) }))
}

function localUatHit([cui, name, county, kind]: UatDirectoryRow): EntitySearchHit {
  const route = entityHref({ docType: 'organization', cuis: [cui], docId: null, docKey: cui, url: null })
  return {
    id: 'uat-directory:' + cui,
    docType: 'organization',
    title: TITLE_PREFIX[kind] + name,
    subtitle: null,
    snippet: null,
    countyName: countyNameRo(county) ?? county,
    roles: ['organization'],
    isUat: true,
    isActive: null,
    identifiers: [cui],
    docId: null,
    docKey: cui,
    url: null,
    score: null,
    href: route?.href ?? '',
    isExternal: route?.isExternal ?? false,
  }
}

function organizationCui(hit: EntitySearchHit): string | undefined {
  if (hit.docType !== 'organization' || hit.isExternal) return
  return /^\/entities\/(\d{2,10})$/u.exec(hit.href)?.[1]
}

export function rankUatSearchHits(
  query: string,
  hits: readonly EntitySearchHit[],
  directory: readonly IndexedUat[],
  limit: number,
): readonly EntitySearchHit[] {
  const liveByCui = new Map<string, EntitySearchHit>()
  for (const hit of hits) {
    const cui = organizationCui(hit)
    if (cui) liveByCui.set(cui, hit)
  }

  const exact: UatDirectoryRow[] = []
  let prefix: UatDirectoryRow | undefined
  for (const { row, searchName } of directory) {
    if (!searchName.startsWith(query) || liveByCui.get(row[0])?.isUat === false) continue
    if (searchName === query) exact.push(row)
    else if (!prefix || (row[3] === 'municipality' && prefix[3] !== 'municipality')) prefix = row
  }

  const preferred = exact.length > 0 ? exact : prefix ? [prefix] : []
  if (preferred.length === 0) return hits
  const preferredCuis = new Set(preferred.map(([cui]) => cui))
  const promoted = preferred.map(row => {
    const live = liveByCui.get(row[0])
    if (!live) return localUatHit(row)
    return live.countyName?.trim() ? live : { ...live, countyName: countyNameRo(row[2]) ?? row[2] }
  })
  const rest = hits.filter(hit => {
    const cui = organizationCui(hit)
    return cui === undefined || !preferredCuis.has(cui)
  })
  return [...promoted, ...rest].slice(0, limit)
}
