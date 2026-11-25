import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  legalSearchResultSchema,
  type LegalSearchResultData,
} from '@/schemas/legal'

/**
 * Live adapter for the Caută tab — one `legalSearch` call per submitted
 * query.
 *
 * `channel: auto` asks for acts AND provision hits. The acts list is the same
 * as `channel: docs` on both sources (the server's docs leg runs on `auto`
 * too). Provision hits are kept only from the OpenSearch engine: measured on
 * production 2026-08-26, the Postgres path's sections are an act-NAME echo
 * ("codul muncii" returns the matched act's own sections, while genuine text
 * phrases return nothing), so serving them would dress a name lookup up as a
 * text search. On legal_v2 every provision hit was verified against the form
 * it names (`servedForm`), whose consolidation label the finder shows.
 *
 * `includeHistorical` rides the URL toggle: the server's default (false)
 * EXCLUDES abrogated / out-of-force acts even from an exact-citation lookup,
 * so "Legea 571/2003" is zero hits until the caller widens it.
 */
const FINDER_SEARCH_QUERY = /* GraphQL */ `
  query LegislationFinderSearch($q: String!, $filter: LegalActsFilter, $includeHistorical: Boolean!, $limit: Int!) {
    legalSearch(q: $q, filter: $filter, includeHistorical: $includeHistorical, channel: auto, limit: $limit) {
      acts {
        score
        act {
          actId
          displayCitation
          actType
          actNumber
          actYear
          issuerSlug
          status
          inDegree
          canonical {
            den
            title
          }
        }
        summary {
          description
        }
      }
      sections {
        act {
          actId
        }
        documentId
        nodeLabel
        snippet
        servedForm {
          documentId
          versionKind
          versionDate
          caveat
          portalLabelRaw
          portalLabelDate
          sourceUrl
        }
      }
      caveats
      engine
      actsTotal
      totalsExhaustive
      degraded
      asOf
      unhydratedHits
    }
  }
`

/** Server act-status enum → the DB kebab vocabulary the UI schema speaks. */
const STATUS_BY_ENUM: Record<string, string> = {
  IN_VIGOARE: 'in-vigoare',
  MODIFICAT: 'modificat',
  ABROGAT: 'abrogat',
  ABROGAT_PARTIAL: 'abrogat-partial',
  SUSPENDAT: 'suspendat',
  IESIT_DIN_VIGOARE: 'iesit-din-vigoare',
  NECUNOSCUT: 'necunoscut',
}

type Raw = Record<string, unknown>

const rec = (value: unknown): Raw =>
  value && typeof value === 'object' ? (value as Raw) : {}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

/** A name with something in it, trimmed: a blank `den` gives way to the title. */
const nonblank = (value: unknown): string | null => {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.length > 0 ? text : null
}

/**
 * The search's filters, each one the engine expresses (measured on the dev API, 25 November 2026: act type,
 * status, a year range, domain, category and penalties narrow the answer; `exclude` and `fiscalImpactNull` are
 * refused, so they are not offered). Values speak the filter's vocabularies: the status in the DB's kebab form,
 * domain and category as the summaries' slugs. Domain, category and penalties are read from the AI summaries:
 * an act without a summary carries none of them, so a filter on them leaves it out.
 */
export type LegalSearchFilter = {
  readonly actType?: readonly string[]
  readonly status?: readonly string[]
  readonly yearFrom?: number
  readonly yearTo?: number
  readonly domain?: readonly string[]
  readonly category?: readonly string[]
  readonly penaltiesMentioned?: boolean
}

/** The filter in `LegalActsFilter`'s shape, or null when nothing narrows the search (the server's own default). */
export function legalSearchFilterInput(filter: LegalSearchFilter | undefined): Raw | null {
  if (!filter) return null
  const parts: Raw = {}
  if (filter.actType?.length) parts.actType = { in: [...filter.actType] }
  if (filter.status?.length) parts.status = { in: [...filter.status] }
  if (filter.yearFrom !== undefined) parts.yearFrom = { gte: filter.yearFrom }
  if (filter.yearTo !== undefined) parts.yearTo = { lte: filter.yearTo }
  if (filter.domain?.length) parts.domain = { in: [...filter.domain] }
  if (filter.category?.length) parts.category = { in: [...filter.category] }
  if (filter.penaltiesMentioned !== undefined) parts.penaltiesMentioned = { eq: filter.penaltiesMentioned }
  return Object.keys(parts).length > 0 ? parts : null
}

export async function fetchLegalSearchLive(
  q: string,
  options: {
    readonly historical?: boolean
    readonly filter?: LegalSearchFilter
    readonly limit?: number
    readonly signal?: AbortSignal
  } = {},
): Promise<LegalSearchResultData> {
  const data = await graphqlQuery<{ legalSearch: Raw }>(
    FINDER_SEARCH_QUERY,
    {
      q,
      filter: legalSearchFilterInput(options.filter),
      includeHistorical: options.historical === true,
      limit: options.limit ?? 20,
    },
    {
      operationName: 'legislationFinderSearch',
      auth: 'none',
      signal: options.signal,
    },
  )

  const result = rec(data.legalSearch)
  const rawActs = Array.isArray(result.acts) ? result.acts : []
  const acts = rawActs.map((hit) => {
    const raw = rec(hit)
    const act = rec(raw.act)
    const summary = rec(raw.summary)
    return {
      score:
        typeof raw.score === 'number' && Number.isFinite(raw.score)
          ? raw.score
          : 0,
      act: {
        actId: String(act.actId ?? ''),
        displayCitation: str(act.displayCitation) ?? String(act.actId ?? ''),
        actType: typeof act.actType === 'string' ? act.actType : '',
        actNumber: str(act.actNumber),
        actYear: typeof act.actYear === 'number' ? act.actYear : null,
        issuerSlug: str(act.issuerSlug),
        // Bridged on legal_v2: a null status or in-degree stays null (unknown).
        status:
          typeof act.status === 'string'
            ? (STATUS_BY_ENUM[act.status] ?? 'necunoscut')
            : null,
        inDegree:
          typeof act.inDegree === 'number' && Number.isFinite(act.inDegree)
            ? Math.trunc(act.inDegree)
            : null,
      },
      description: str(summary.description),
      // The Portal's name, for an act whose citation names nothing (LEG-PDYY): its `den`, else its short title.
      name: nonblank(rec(act.canonical).den) ?? nonblank(rec(act.canonical).title),
    }
  })

  const engine = str(result.engine) ?? 'postgres'
  // Provision hits are content matches only on the OpenSearch engine; the
  // Postgres path's are a name echo (see the note at the top) and dropped.
  const sections =
    engine !== 'opensearch' || !Array.isArray(result.sections)
      ? []
      : result.sections.flatMap((hit) => {
          const raw = rec(hit)
          // BigInt travels as a string; accept a number too, never invent one.
          const rawActId = rec(raw.act).actId
          const actId =
            typeof rawActId === 'string' || typeof rawActId === 'number' ? String(rawActId) : ''
          const documentId = str(raw.documentId)
          if (actId === '' || documentId === null) return []
          const served = raw.servedForm ? rec(raw.servedForm) : null
          return [
            {
              actId,
              documentId,
              nodeLabel: str(raw.nodeLabel),
              snippet: str(raw.snippet),
              servedForm:
                served === null
                  ? null
                  : {
                      documentId: str(served.documentId),
                      versionKind: str(served.versionKind),
                      versionDate: str(served.versionDate),
                      caveat: str(served.caveat),
                      portalLabelRaw: str(served.portalLabelRaw),
                      portalLabelDate: str(served.portalLabelDate),
                      sourceUrl: str(served.sourceUrl),
                    },
            },
          ]
        })

  return legalSearchResultSchema.parse({
    acts,
    sections,
    caveats: (Array.isArray(result.caveats) ? result.caveats : []).filter(
      (caveat): caveat is string => typeof caveat === 'string',
    ),
    engine,
    // null is a CLAIM ("this path cannot count"), never coerced to 0.
    actsTotal:
      typeof result.actsTotal === 'number' && Number.isFinite(result.actsTotal)
        ? Math.trunc(result.actsTotal)
        : null,
    // Missing/junk flags degrade in the SAFE direction: a total is only
    // exhaustive when the server said so; an answer is degraded unless the
    // server said it is not.
    totalsExhaustive: result.totalsExhaustive === true,
    degraded: result.degraded !== false,
    asOf: str(result.asOf),
    unhydratedHits:
      typeof result.unhydratedHits === 'number' &&
      Number.isFinite(result.unhydratedHits)
        ? Math.trunc(result.unhydratedHits)
        : 0,
  })
}
