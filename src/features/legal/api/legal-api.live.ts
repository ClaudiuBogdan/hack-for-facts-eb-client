import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  legislationFrontDoorSchema,
  legislationOverviewSchema,
  type LegislationFrontDoor,
  type LegislationOverview,
} from '@/schemas/legal'
import { LEGAL_CORPUS_MEASURED_AT } from '../lib/legal-coverage'

/**
 * Live overview adapter — ONE round-trip for the overview's bands:
 *
 *  - `legalActs(sort: IN_DEGREE, dir: DESC, first: 7)` for the ranked band;
 *  - `moIssues(filter: { year }, sort: ISSUE_DATE_DESC, pageSize: 5)` for the
 *    gazette band — the year bound is mandatory server-side, so a year with
 *    no issues yet (early January) retries the previous year once.
 *
 * The four headline counts are GONE from here (2026-08-26): they used to be
 * four aliased `legalActs(filter: { status }).totalCount` calls, and now
 * ride their own `legalActCounts(groupBy: STATUS)` request
 * (`legal-status-counts-api.ts`) — one aggregate serves the strip and the
 * chips, and its failure degrades those surfaces instead of failing this
 * loader-run query.
 *
 * Coverage stays a MEASURED block (constants + date), not live counts — the
 * server has no aggregate for the gap figures, and printing measurements as
 * if they were live is exactly what `legal-coverage.ts` forbids.
 *
 * The front door asks for the gazette band alone (`LegislationFrontDoor`):
 * the ranking is the analytics tab's, and the `IN_DEGREE` sort is the slow
 * half of the overview's request.
 */
const MO_ISSUES_SELECTION = /* GraphQL */ `
  moIssues(filter: { year: { eq: $moYear } }, pageSize: 5, sort: ISSUE_DATE_DESC) {
    edges {
      node {
        moIssueId
        partCode
        issueLabel
        issueNumber
        issueYear
        issueDate
        pdfUrl
        hasEmonitorLink
      }
    }
  }
`

const OVERVIEW_QUERY = /* GraphQL */ `
  query LegislationOverview($moYear: Int!) {
    mostCited: legalActs(sort: IN_DEGREE, dir: DESC, first: 7) {
      edges {
        node {
          actId
          displayCitation
          actType
          actNumber
          actYear
          issuerSlug
          status
          inDegree
        }
      }
    }
    ${MO_ISSUES_SELECTION}
  }
`

const FRONT_DOOR_QUERY = /* GraphQL */ `
  query LegislationFrontDoor($moYear: Int!) {
    ${MO_ISSUES_SELECTION}
  }
`

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

const int = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0

function nodes(connection: unknown): Raw[] {
  const edges = rec(connection).edges
  return Array.isArray(edges) ? edges.map((edge) => rec(rec(edge).node)) : []
}

function mapActNode(node: Raw) {
  return {
    actId: String(node.actId ?? ''),
    displayCitation: str(node.displayCitation) ?? String(node.actId ?? ''),
    actType: str(node.actType) ?? '',
    actNumber: str(node.actNumber),
    actYear: typeof node.actYear === 'number' ? node.actYear : null,
    issuerSlug: str(node.issuerSlug),
    status: STATUS_BY_ENUM[str(node.status) ?? ''] ?? 'necunoscut',
    inDegree: int(node.inDegree),
  }
}

function mapIssueNode(node: Raw) {
  return {
    moIssueId: String(node.moIssueId ?? ''),
    partCode: str(node.partCode) ?? '',
    issueLabel: str(node.issueLabel) ?? '',
    issueNumber: typeof node.issueNumber === 'number' ? node.issueNumber : null,
    issueYear: typeof node.issueYear === 'number' ? node.issueYear : 0,
    issueDate: str(node.issueDate),
    pdfUrl: str(node.pdfUrl),
    hasEmonitorLink: node.hasEmonitorLink === true,
  }
}

/**
 * One read of `query` for this year's issues; early in January the mandatory
 * year bound can precede the first issue, so a year with none reads the
 * previous year's issues once more.
 */
async function readWithLatestIssues(
  query: string,
  operationName: string,
  currentYear: number,
  signal?: AbortSignal,
): Promise<Raw> {
  const run = (moYear: number) =>
    graphqlQuery<Raw>(query, { moYear }, { operationName, auth: 'none', signal })
  const data = await run(currentYear)
  if (nodes(data.moIssues).length > 0) return data
  const previous = await run(currentYear - 1)
  return { ...data, moIssues: previous.moIssues }
}

export async function fetchLegislationOverviewLive(
  signal?: AbortSignal,
): Promise<LegislationOverview> {
  const currentYear = new Date().getFullYear()
  const data = await readWithLatestIssues(OVERVIEW_QUERY, 'legislationOverview', currentYear, signal)

  return legislationOverviewSchema.parse({
    mostCitedActs: nodes(data.mostCited).map(mapActNode),
    latestGazetteIssues: nodes(data.moIssues).map(mapIssueNode),
    coverage: liveCoverage(currentYear),
  })
}

/** The front door's band: the latest gazette issues, without the ranking. */
export async function fetchLegislationFrontDoorLive(
  signal?: AbortSignal,
): Promise<LegislationFrontDoor> {
  const currentYear = new Date().getFullYear()
  const data = await readWithLatestIssues(FRONT_DOOR_QUERY, 'legislationFrontDoor', currentYear, signal)

  return legislationFrontDoorSchema.parse({
    latestGazetteIssues: nodes(data.moIssues).map(mapIssueNode),
    coverage: liveCoverage(currentYear),
  })
}

/** The measured coverage block both payloads carry (see the note at the top). */
function liveCoverage(currentYear: number) {
  return {
    authorities: ['Portal Legislativ', 'Monitorul Oficial'],
    yearsRange: [1990, currentYear],
    retrievedAt: LEGAL_CORPUS_MEASURED_AT,
    publishedAt: null,
    knownGaps: [
      'Deciziile Curții Constituționale nu modifică statutul actelor vizate.',
      'Structura pe articole lipsește pentru ~31% dintre documente.',
      '36,3% dintre trimiterile între acte nu se rezolvă la un act.',
      'Doar 46,4% dintre publicările din Monitor se leagă sigur de un act.',
      'Monitorul Oficial: fără strat de text înainte de 2012.',
    ],
    inaccessibleCount: 0,
    dataStatus: 'live',
  }
}
