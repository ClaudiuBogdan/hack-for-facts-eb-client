import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  legalSearchResultSchema,
  type LegalSearchResultData,
} from '@/schemas/legal'

/**
 * Live adapter for the Caută tab — one `legalSearch` call per submitted
 * query.
 *
 * `channel: docs` is a hardcoded literal, not an option: measured on
 * production 2026-08-26, the sections channel is an act-NAME echo ("codul
 * muncii" returns the matched act's own sections, while genuine text phrases
 * — "concediu de odihna", "salariul minim", "contract individual de munca" —
 * return nothing), so requesting sections would dress a name lookup up as a
 * text search. Re-open the channel when the OpenSearch engine ships and
 * sections become content matches.
 *
 * `includeHistorical` rides the URL toggle: the server's default (false)
 * EXCLUDES abrogated / out-of-force acts even from an exact-citation lookup,
 * so "Legea 571/2003" is zero hits until the caller widens it.
 */
const FINDER_SEARCH_QUERY = /* GraphQL */ `
  query LegislationFinderSearch($q: String!, $includeHistorical: Boolean!, $limit: Int!) {
    legalSearch(q: $q, includeHistorical: $includeHistorical, channel: docs, limit: $limit) {
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
        }
        summary {
          description
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

export async function fetchLegalSearchLive(
  q: string,
  options: {
    readonly historical?: boolean
    readonly limit?: number
    readonly signal?: AbortSignal
  } = {},
): Promise<LegalSearchResultData> {
  const data = await graphqlQuery<{ legalSearch: Raw }>(
    FINDER_SEARCH_QUERY,
    {
      q,
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
        status:
          STATUS_BY_ENUM[typeof act.status === 'string' ? act.status : ''] ??
          'necunoscut',
        inDegree:
          typeof act.inDegree === 'number' && Number.isFinite(act.inDegree)
            ? Math.trunc(act.inDegree)
            : 0,
      },
      description: str(summary.description),
    }
  })

  return legalSearchResultSchema.parse({
    acts,
    caveats: (Array.isArray(result.caveats) ? result.caveats : []).filter(
      (caveat): caveat is string => typeof caveat === 'string',
    ),
    engine: str(result.engine) ?? 'postgres',
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
