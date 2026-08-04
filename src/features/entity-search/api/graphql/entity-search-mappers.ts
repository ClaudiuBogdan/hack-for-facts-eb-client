/**
 * Maps the raw `searchEntities` GraphQL shapes onto the UI's
 * `EntitySearchHit` / `EntitySearchResult` seam types. Each hit's deep-link
 * (`href` + `isExternal`) is computed here via the pure routing module so the
 * components never have to know the per-doc-type route map.
 *
 * A hit with no usable target (CUI-spine with empty `cuis`, interim with no
 * `url`) gets `href: ''` + `isExternal: false`; the component renders it as a
 * non-clickable row (an empty href is the "not linkable" sentinel).
 */
import type {
  EntitySearchFacet,
  EntitySearchHit,
  EntitySearchResult,
} from '@/schemas/entity-search'
import { entityHref } from '../../lib/entity-search-routing'
import type {
  RawSearchFacet,
  RawSearchHit,
  SearchEntitiesResponse,
} from './entity-search-queries'

function toNumberOrNull(value: string | number | null): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function toStringOrNull(value: string | number | null): string | null {
  if (value == null) return null
  return typeof value === 'string' ? value : String(value)
}

export function mapSearchHit(raw: RawSearchHit): EntitySearchHit {
  const cuis = raw.cuis ?? []
  const docId = toStringOrNull(raw.docId)
  const link = entityHref({
    docType: raw.docType,
    cuis,
    docId,
    docKey: raw.docKey,
    url: raw.url,
  })

  return {
    id: raw.id,
    docType: raw.docType,
    title: raw.title,
    subtitle: raw.subtitle,
    snippet: raw.snippet,
    countyName: raw.countyName,
    roles: raw.roles ?? [],
    isActive: raw.isActive ?? true,
    identifiers: raw.identifiers ?? cuis,
    docId,
    docKey: raw.docKey,
    url: raw.url,
    score: toNumberOrNull(raw.score),
    // '' is the "no usable target" sentinel — the row renders non-clickable.
    href: link?.href ?? '',
    isExternal: link?.isExternal ?? false,
  }
}

function mapSearchFacet(raw: RawSearchFacet): EntitySearchFacet {
  return { field: raw.field, value: raw.value, count: raw.count }
}

export function mapSearchResult(
  response: SearchEntitiesResponse,
): EntitySearchResult {
  const result = response.searchEntities
  return {
    query: result.query,
    engine: result.engine,
    estimatedTotalHits: result.estimatedTotalHits,
    facets: result.facets.map(mapSearchFacet),
    hits: result.hits.map(mapSearchHit),
  }
}
