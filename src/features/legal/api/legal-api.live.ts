import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  legislationOverviewSchema,
  type LegislationOverview,
} from '@/schemas/legal'
import { LEGAL_CORPUS_MEASURED_AT } from '../lib/legal-coverage'

/**
 * Live overview adapter — the four calls named by `main-page.md` §5, folded
 * into ONE aliased GraphQL round-trip:
 *
 *  - unfiltered `legalActs(first: 1).totalCount` + three status-filtered
 *    variants for the KPI strip (status filter values are the DB kebab
 *    vocabulary — the filter input is string-typed, not a GraphQL enum);
 *  - `legalActs(sort: IN_DEGREE, dir: DESC, first: 7)` for the ranked band;
 *  - `moIssues(filter: { year }, sort: ISSUE_DATE_DESC, pageSize: 5)` for the
 *    gazette band — the year bound is mandatory server-side, so a year with
 *    no issues yet (early January) retries the previous year once.
 *
 * Coverage stays a MEASURED block (constants + date), not live counts — the
 * server has no aggregate for the gap figures, and printing measurements as
 * if they were live is exactly what `legal-coverage.ts` forbids.
 */
const OVERVIEW_QUERY = /* GraphQL */ `
  query LegislationOverview($abrogatIn: [String!]!, $inVigoareIn: [String!]!, $modificatIn: [String!]!, $moYear: Int!) {
    all: legalActs(first: 1) {
      totalCount
    }
    inVigoare: legalActs(filter: { status: { in: $inVigoareIn } }, first: 1) {
      totalCount
    }
    modificat: legalActs(filter: { status: { in: $modificatIn } }, first: 1) {
      totalCount
    }
    abrogat: legalActs(filter: { status: { in: $abrogatIn } }, first: 1) {
      totalCount
    }
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

async function runOverviewQuery(moYear: number, signal?: AbortSignal): Promise<Raw> {
  return graphqlQuery<Raw>(
    OVERVIEW_QUERY,
    {
      inVigoareIn: ['in-vigoare'],
      modificatIn: ['modificat'],
      abrogatIn: ['abrogat', 'abrogat-partial'],
      moYear,
    },
    { operationName: 'legislationOverview', auth: 'none', signal },
  )
}

export async function fetchLegislationOverviewLive(
  signal?: AbortSignal,
): Promise<LegislationOverview> {
  const currentYear = new Date().getFullYear()
  let data = await runOverviewQuery(currentYear, signal)
  // Early January: the mandatory year bound can precede the first issue.
  if (nodes(data.moIssues).length === 0) {
    const previous = await runOverviewQuery(currentYear - 1, signal)
    data = { ...data, moIssues: previous.moIssues }
  }

  return legislationOverviewSchema.parse({
    counts: {
      total: int(rec(data.all).totalCount),
      inVigoare: int(rec(data.inVigoare).totalCount),
      modificat: int(rec(data.modificat).totalCount),
      abrogat: int(rec(data.abrogat).totalCount),
    },
    mostCitedActs: nodes(data.mostCited).map(mapActNode),
    latestGazetteIssues: nodes(data.moIssues).map(mapIssueNode),
    coverage: {
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
    },
  })
}
