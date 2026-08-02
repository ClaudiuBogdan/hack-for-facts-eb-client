import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  legalActDetailSchema,
  type LegalActDetail,
  type LegalActStatus,
} from '@/schemas/legal'

/**
 * Live act-detail adapter — one `legalAct` round-trip for the whole page.
 *
 * Every block on `/legislation/acts/$actId` is a field on this single query, so
 * the page costs exactly one request no matter how much of the disclosure ladder
 * a given act populates.
 *
 * Node text is not requested because it does not exist: `LegalNode` serves
 * `charStart`/`charEnd` locators only (server SDL §3.4). See
 * `docs/design/legal/act-detail.md` §1.
 */
const ACT_DETAIL_QUERY = /* GraphQL */ `
  query LegalActDetail(
    $actId: BigInt
    $citation: String
    $outFirst: Int!
    $inFirst: Int!
  ) {
    legalAct(actId: $actId, citation: $citation) {
      actId
      displayCitation
      actType
      actNumber
      actYear
      issuerSlug
      status
      statusEvidence
      entryIntoForce
      inDegree
      aliases
      amendedAfterPublication
      canonicalDocumentId
      canonical {
        documentId
        versionKind
        versionDate
        den
        title
        issuerRaw
        publicationRaw
        firstPublicationDate
        extractionStatus
        compatibilityTier
      }
      summary {
        description
        plainLanguageSummary
        documentCategory
        domains
        affectedAudiences
        keywords
        keyDates
        penaltiesMentioned
        fiscalImpact
        confidence
      }
      timeline {
        kind
        effectiveDate
        label
        eventSource
        relatedActId
      }
      gazettePublications {
        moIssueId
        resolution
        matchedVia
        sourcePdfUrl
        issue {
          partCode
          issueNumber
          issueYear
          issueDate
        }
      }
      outLinks: links(direction: OUT, first: $outFirst) {
        totalCount
        edges {
          relation
          resolution
          confidence
          targetRaw
          targetAct {
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
      inLinks: links(direction: IN, first: $inFirst) {
        totalCount
        edges {
          relation
          resolution
          confidence
          targetRaw
          sourceAct {
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
      structure: tree(depth: 1) {
        nodeId
        nodeKind
        label
        path
      }
    }
  }
`

/** GraphQL enum name → the kebab vocabulary the UI schema speaks. */
const STATUS_BY_ENUM: Record<string, LegalActStatus> = {
  IN_VIGOARE: 'in-vigoare',
  MODIFICAT: 'modificat',
  ABROGAT: 'abrogat',
  ABROGAT_PARTIAL: 'abrogat-partial',
  SUSPENDAT: 'suspendat',
  IESIT_DIN_VIGOARE: 'iesit-din-vigoare',
  NECUNOSCUT: 'necunoscut',
}

const RESOLUTIONS = new Set(['unique', 'cluster', 'unresolved', 'external'])

/**
 * Page sizes for the two graph directions.
 *
 * Outgoing runs generously because out-degree is small (26 on the Codul Fiscal)
 * and a page above the real count is what makes `totalCount` trustworthy.
 * Incoming stays short: the true total comes from `inDegree`, and nobody reads
 * 2.621 rows inline.
 */
const OUT_PAGE_SIZE = 60
const IN_PAGE_SIZE = 12

type RawAct = Record<string, unknown>

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function asInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0
}

/** Like `asInt`, but a missing number stays missing instead of becoming a zero. */
function asNullableInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.trunc(value)
    : null
}

/**
 * A confidence the UI is willing to render as a percentage.
 *
 * `formatLegalPercent` multiplies by 100, so a value on a 0–100 scale would
 * render "9.500%". Anything outside the unit interval is dropped rather than
 * reshaped — we do not know which scale it meant.
 */
function asUnitInterval(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []
}

function mapStatus(value: unknown): LegalActStatus {
  const key = typeof value === 'string' ? value : ''
  return STATUS_BY_ENUM[key] ?? 'necunoscut'
}

function mapListItem(value: unknown) {
  const raw = asRecord(value)
  if (asString(raw.actId) === null) return null
  return {
    actId: String(raw.actId),
    displayCitation: asString(raw.displayCitation) ?? String(raw.actId),
    actType: asString(raw.actType) ?? '',
    actNumber: asString(raw.actNumber),
    actYear: typeof raw.actYear === 'number' ? raw.actYear : null,
    issuerSlug: asString(raw.issuerSlug),
    status: mapStatus(raw.status),
    inDegree: asInt(raw.inDegree),
  }
}

/**
 * `key_dates` arrives as free-form JSON. Entries whose `date` is null are kept
 * — the model puts the date in the prose often enough that dropping them loses
 * real information (see `legalKeyDateSchema`).
 */
function mapKeyDates(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const raw = asRecord(entry)
    const description = asString(raw.description)
    if (description === null) return []
    return [{ date: asString(raw.date), description }]
  })
}

/**
 * @param pageSize the `first` we asked for — needed to tell a real total from a
 *   saturated one.
 * @param authoritativeTotal a count from elsewhere that is meant to be true
 *   (`inDegree` for the incoming direction). Preferred over the connection's
 *   own, but only while it agrees with what actually came back.
 */
function mapReferenceGroup(
  value: unknown,
  actKey: 'targetAct' | 'sourceAct',
  pageSize: number,
  authoritativeTotal?: number | null,
) {
  const raw = asRecord(value)
  const edges = Array.isArray(raw.edges) ? raw.edges : []
  const items = edges.map((edge) => {
    const entry = asRecord(edge)
    const resolution = asString(entry.resolution) ?? 'unresolved'
    return {
      relation: asString(entry.relation) ?? 'FACE_REFERIRE',
      resolution: (RESOLUTIONS.has(resolution)
        ? resolution
        : 'unresolved') as 'unique' | 'cluster' | 'unresolved' | 'external',
      confidence: typeof entry.confidence === 'number' ? entry.confidence : null,
      targetRaw: asString(entry.targetRaw),
      act: mapListItem(entry[actKey]),
    }
  })

  // An authoritative count still has to survive contact with the rows we got.
  // `inDegree` is a stored column and can lag the edge table, so a total below
  // what came back is not a total — it is a stale number that would render
  // "0 trimiteri" above a list of them. Disagreement means unknown.
  if (authoritativeTotal !== undefined && authoritativeTotal !== null) {
    const credible = authoritativeTotal >= items.length
    return {
      totalCount: credible ? authoritativeTotal : null,
      hasMore: credible ? items.length < authoritativeTotal : true,
      items,
    }
  }

  // `totalCount` is the page size, not a total (see `legalReferenceGroupSchema`).
  // A value below what we asked for is the real count; anything else — including
  // an absent field, which must not become a confident zero — is unknown.
  const reported = asNullableInt(raw.totalCount)
  if (reported === null) {
    return { totalCount: null, hasMore: items.length > 0, items }
  }

  const saturated = reported >= pageSize
  return {
    totalCount: saturated ? null : reported,
    hasMore: saturated,
    items,
  }
}

function mapAct(raw: RawAct): LegalActDetail {
  const evidence = asRecord(raw.statusEvidence)
  const canonical = raw.canonical ? asRecord(raw.canonical) : null
  const summary = raw.summary ? asRecord(raw.summary) : null
  const canonicalDocumentId = asString(raw.canonicalDocumentId)

  return legalActDetailSchema.parse({
    actId: String(raw.actId),
    displayCitation: asString(raw.displayCitation) ?? String(raw.actId),
    actType: asString(raw.actType) ?? '',
    actNumber: asString(raw.actNumber),
    actYear: typeof raw.actYear === 'number' ? raw.actYear : null,
    issuerSlug: asString(raw.issuerSlug),
    status: mapStatus(raw.status),
    statusEvidence: {
      modifiedByCount: asInt(evidence.modified_by_count),
      contradictedAbrogations: asInt(evidence.contradicted_abrogations),
      abrogatedByCount: Array.isArray(evidence.abrogated_by)
        ? evidence.abrogated_by.length
        : 0,
      futureEventCount: Array.isArray(evidence.future_events)
        ? evidence.future_events.length
        : 0,
    },
    entryIntoForce: asString(raw.entryIntoForce),
    inDegree: asInt(raw.inDegree),
    aliases: asStringArray(raw.aliases),
    amendedAfterPublication: asInt(raw.amendedAfterPublication),
    canonical: canonical
      ? {
          documentId: String(canonical.documentId ?? ''),
          versionKind: asString(canonical.versionKind) ?? 'original',
          versionDate: asString(canonical.versionDate),
          den: asString(canonical.den),
          title: asString(canonical.title),
          issuerRaw: asString(canonical.issuerRaw),
          publicationRaw: asString(canonical.publicationRaw),
          firstPublicationDate: asString(canonical.firstPublicationDate),
          extractionStatus: asString(canonical.extractionStatus),
          compatibilityTier: asString(canonical.compatibilityTier),
        }
      : null,
    summary: summary
      ? {
          description: asString(summary.description),
          plainLanguageSummary: asString(summary.plainLanguageSummary),
          documentCategory: asString(summary.documentCategory),
          domains: asStringArray(summary.domains),
          affectedAudiences: asStringArray(summary.affectedAudiences),
          keywords: asStringArray(summary.keywords),
          keyDates: mapKeyDates(summary.keyDates),
          penaltiesMentioned:
            typeof summary.penaltiesMentioned === 'boolean'
              ? summary.penaltiesMentioned
              : null,
          fiscalImpact: asString(summary.fiscalImpact),
          confidence: asUnitInterval(summary.confidence),
        }
      : null,
    timeline: (Array.isArray(raw.timeline) ? raw.timeline : []).map((entry) => {
      const item = asRecord(entry)
      return {
        kind: asString(item.kind) ?? 'status_event',
        effectiveDate: asString(item.effectiveDate),
        label: asString(item.label) ?? '',
        eventSource: asString(item.eventSource),
        relatedActId: item.relatedActId ? String(item.relatedActId) : null,
      }
    }),
    gazettePublications: (Array.isArray(raw.gazettePublications)
      ? raw.gazettePublications
      : []
    ).map((entry) => {
      const item = asRecord(entry)
      const issue = asRecord(item.issue)
      return {
        moIssueId: asString(item.moIssueId),
        partCode: asString(issue.partCode),
        issueNumber: typeof issue.issueNumber === 'number' ? issue.issueNumber : null,
        issueYear: typeof issue.issueYear === 'number' ? issue.issueYear : null,
        issueDate: asString(issue.issueDate),
        pdfUrl: asString(item.sourcePdfUrl),
        resolution: asString(item.resolution),
        matchedVia: asString(item.matchedVia),
      }
    }),
    outLinks: mapReferenceGroup(raw.outLinks, 'targetAct', OUT_PAGE_SIZE),
    // `inDegree` is stored on the act row and is the real incoming total, so it
    // overrides the connection's saturating count — but a missing one stays
    // missing rather than collapsing to an authoritative zero.
    inLinks: mapReferenceGroup(
      raw.inLinks,
      'sourceAct',
      IN_PAGE_SIZE,
      asNullableInt(raw.inDegree),
    ),
    structure: (Array.isArray(raw.structure) ? raw.structure : []).map((entry) => {
      const item = asRecord(entry)
      return {
        nodeId: String(item.nodeId ?? ''),
        nodeKind: asString(item.nodeKind) ?? 'nod',
        label: asString(item.label),
        path: asString(item.path) ?? '',
      }
    }),
    officialTextUrl:
      canonicalDocumentId === null
        ? null
        : `https://legislatie.just.ro/Public/DetaliiDocument/${canonicalDocumentId}`,
  })
}

/** Fetch one act by numeric id. Returns `null` when the act does not exist. */
export async function fetchLegalActDetailLive(
  actId: string,
  signal?: AbortSignal,
): Promise<LegalActDetail | null> {
  const data = await graphqlQuery<{ legalAct: RawAct | null }>(
    ACT_DETAIL_QUERY,
    { actId, outFirst: OUT_PAGE_SIZE, inFirst: IN_PAGE_SIZE },
    { operationName: 'legalAct', auth: 'none', signal },
  )

  if (!data.legalAct) return null
  return mapAct(data.legalAct)
}
