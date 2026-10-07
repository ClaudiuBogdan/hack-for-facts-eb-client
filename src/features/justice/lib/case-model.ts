import type { JudicialCase, JudicialCaseDetail, JudicialLegalReference, JudicialPartyKind } from '@/schemas/judicial'

/**
 * One case's sheet, from the case page's reads. Pure. The rules it keeps:
 * a hearing dated after the capture is scheduled, not held; parties are
 * counted by role and kind, never named; a law links only where the API
 * resolved the citation to an act; a case at another court under the same
 * file is a candidate the API derived, never a fact.
 */

export interface HearingRow {
  readonly index: number
  readonly at: string | null
  readonly panel: string | null
  readonly pronouncedOn: string | null
  readonly document: { readonly number: string | null; readonly date: string | null } | null
  /** Dated after the source's newest modification: scheduled when the portal was read, not held. */
  readonly scheduled: boolean
}

export interface AppealRow {
  readonly index: number
  readonly declaredOn: string | null
  readonly type: string | null
}

export interface PartyRoleGroup {
  /** The normalised role (`reclamant`, `parat`); null when the source gives none. */
  readonly role: string | null
  readonly total: number
  /**
   * The kinds in the role, in a fixed order, the empty ones left out; an
   * organisation kind with the legal forms its parties carry (`SRL`, `SA`),
   * each with how many carry it — the rest carry none in the source.
   */
  readonly kinds: readonly { readonly kind: JudicialPartyKind; readonly count: number; readonly legalForms: readonly { readonly form: string; readonly count: number }[] }[]
}

export interface LawRow {
  readonly key: string
  /** The act as the legislation registry cites it („Legea nr. 302/2004"), or the citation as extracted („art.336 ncp"). */
  readonly label: string
  /** The resolved act; null when the citation did not resolve to one (a code alias, an act outside the registry). */
  readonly actId: string | null
  /** The articles cited, each once. */
  readonly articles: readonly string[]
  /** For an unresolved alias of a code, the code's name. */
  readonly code: CodeAlias | null
}

export type CodeAlias = 'ncp' | 'ncpp' | 'ncpc' | 'ncc'

export interface RelatedCase {
  readonly caseId: string
  readonly institutionCode: string
  readonly caseNumber: string
  readonly category: string | null
  readonly stageName: string | null
  readonly sourceOpenedAt: string | null
  /** The API's own label: a candidate, or one it asks to be reviewed. */
  readonly status: string
}

export type RelatedCaseRead =
  | { readonly status: 'none' }
  | { readonly status: 'failed' }
  | { readonly status: 'read'; readonly cases: readonly Pick<JudicialCase, 'caseId' | 'institutionCode' | 'caseNumber' | 'category' | 'stageName' | 'sourceOpenedAt'>[] }

export interface CaseSheet {
  readonly case: JudicialCase
  readonly hearings: readonly HearingRow[]
  readonly appeals: readonly AppealRow[]
  readonly parties: readonly PartyRoleGroup[]
  readonly partyCount: number
  readonly personPartyCount: number
  readonly laws: readonly LawRow[]
  readonly related: readonly RelatedCase[]
  /** Links the page does not list: past the ones it reads, or with no case at their other end. */
  readonly relatedUnlisted: number
  /** The source's newest stored modification: the date the case is read as of. Null for the ÎCCJ's archive. */
  readonly asOf: string | null
  /** The related cases' read failed: the sheet is served once and read again. */
  readonly partial: boolean
}

const KIND_ORDER: readonly JudicialPartyKind[] = ['public_entity', 'company', 'person', 'unknown']

/** Sole-trader forms are a person's business: shown, they would point at a person. */
const SOLE_TRADER_FORM = /^(?:p\.?\s?f\.?\s?a\.?|i\.?\s?i\.?|i\.?\s?f\.?)$/i

/** The links the page lists: the same file at another court, as a candidate or awaiting review — never a rejected one. */
const SHOWN_LINK_TYPE = 'same_dossier_cross_institution'
const SHOWN_LINK_STATUSES = new Set(['candidate', 'needs_review'])

function shownLinks(detail: Pick<JudicialCaseDetail, 'lineage'>): JudicialCaseDetail['lineage'] {
  return detail.lineage.filter((edge) => edge.lineageType === SHOWN_LINK_TYPE && SHOWN_LINK_STATUSES.has(edge.validationStatus))
}

/** The other end of each same-file link, each once, in the API's order; links with no case at the other end are left out. */
export function otherCaseIds(detail: Pick<JudicialCaseDetail, 'case' | 'lineage'>): readonly string[] {
  const own = detail.case.caseId
  const ids = shownLinks(detail).map((edge) => (edge.fromCaseId === own ? edge.toCaseId : edge.fromCaseId)).filter((id): id is string => id !== null && id !== own)
  return [...new Set(ids)]
}

const byDateDescending = (a: string | null, b: string | null) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? 1 : -1)

export function hearingRows(detail: Pick<JudicialCaseDetail, 'hearings' | 'asOf'>): readonly HearingRow[] {
  const asOf = detail.asOf.asOf
  return [...detail.hearings]
    .sort((a, b) => byDateDescending(a.hearingAt, b.hearingAt) || b.hearingIndex - a.hearingIndex)
    .map((hearing) => ({
      index: hearing.hearingIndex,
      at: hearing.hearingAt,
      panel: hearing.panel,
      pronouncedOn: hearing.pronouncementDate,
      document: hearing.documentNumber || hearing.documentDate ? { number: hearing.documentNumber, date: hearing.documentDate } : null,
      scheduled: asOf !== null && hearing.hearingAt !== null && hearing.hearingAt > asOf,
    }))
}

export function partyGroups(detail: Pick<JudicialCaseDetail, 'parties'>): readonly PartyRoleGroup[] {
  const groups = new Map<string, { role: string | null; first: number; kinds: Map<JudicialPartyKind, number>; forms: Map<JudicialPartyKind, Map<string, number>> }>()
  for (const party of detail.parties) {
    const key = party.roleNormalized ?? ''
    const group = groups.get(key) ?? { role: party.roleNormalized, first: party.partyIndex, kinds: new Map(), forms: new Map() }
    group.first = Math.min(group.first, party.partyIndex)
    group.kinds.set(party.partyKind, (group.kinds.get(party.partyKind) ?? 0) + 1)
    // A legal form is an organisation's; a person's would be a sole-trader form, which can name its owner.
    if (party.legalForm && (party.partyKind === 'company' || party.partyKind === 'public_entity') && !SOLE_TRADER_FORM.test(party.legalForm.trim())) {
      const forms = group.forms.get(party.partyKind) ?? new Map<string, number>()
      forms.set(party.legalForm.trim(), (forms.get(party.legalForm.trim()) ?? 0) + 1)
      group.forms.set(party.partyKind, forms)
    }
    groups.set(key, group)
  }
  return [...groups.values()]
    .sort((a, b) => a.first - b.first)
    .map((group) => ({
      role: group.role,
      total: [...group.kinds.values()].reduce((sum, count) => sum + count, 0),
      kinds: KIND_ORDER.flatMap((kind) => {
        const count = group.kinds.get(kind) ?? 0
        const legalForms = [...(group.forms.get(kind) ?? new Map<string, number>()).entries()]
          .map(([form, formCount]) => ({ form, count: formCount }))
          .sort((a, b) => b.count - a.count || a.form.localeCompare(b.form))
        return count > 0 ? [{ kind, count, legalForms }] : []
      }),
    }))
}

const CODE_ALIAS = /\b(ncp|ncpp|ncpc|ncc)\b/i

/** How the legislation registry writes an act's citation („Legea nr. 85/2014", „OUG nr. 195/2002"), from the citation's own type, number and year. */
const ACT_TYPE_LABEL: Readonly<Record<string, string>> = { lege: 'Legea', oug: 'OUG', og: 'OG', hg: 'HG' }

export function actCitationLabel(reference: Pick<JudicialLegalReference, 'actType' | 'actNumber' | 'actYear'>): string | null {
  const type = reference.actType ? ACT_TYPE_LABEL[reference.actType.toLowerCase()] : undefined
  if (!type || !reference.actNumber || reference.actYear === null) return null
  return `${type} nr. ${reference.actNumber}/${reference.actYear}`
}

/** The laws a case cites, each once: resolved acts first, by their citation, then what did not resolve. */
export function lawRows(detail: Pick<JudicialCaseDetail, 'legalReferences'>): readonly LawRow[] {
  const rows = new Map<string, { label: string; actId: string | null; articles: Set<string>; code: CodeAlias | null }>()
  for (const reference of detail.legalReferences) {
    const actId = reference.targetActId
    const key = actId ? `act:${actId}` : `citation:${reference.citation.toLowerCase().replace(/\s+/g, ' ').trim()}`
    const alias = actId ? null : (CODE_ALIAS.exec(reference.citation)?.[1]?.toLowerCase() as CodeAlias | undefined)
    const row = rows.get(key) ?? {
      label: (actId ? actCitationLabel(reference) : null) ?? reference.citation.trim(),
      actId,
      articles: new Set<string>(),
      code: alias ?? null,
    }
    if (actId && reference.articleFragment) row.articles.add(reference.articleFragment)
    rows.set(key, row)
  }
  return [...rows.entries()]
    .map(([key, row]) => ({ key, label: row.label, actId: row.actId, articles: [...row.articles].sort(), code: row.code }))
    .sort((a, b) => Number(b.actId !== null) - Number(a.actId !== null) || a.label.localeCompare(b.label, 'ro'))
}

export function caseSheetOf(detail: JudicialCaseDetail, related: RelatedCaseRead): CaseSheet {
  const ids = otherCaseIds(detail)
  const statusOf = new Map<string, string>()
  for (const edge of shownLinks(detail)) {
    const other = edge.fromCaseId === detail.case.caseId ? edge.toCaseId : edge.fromCaseId
    if (other !== null && !statusOf.has(other)) statusOf.set(other, edge.validationStatus)
  }
  const relatedCases: readonly RelatedCase[] =
    related.status === 'read' ? related.cases.map((other) => ({ ...other, status: statusOf.get(other.caseId) ?? 'candidate' })) : []
  const unresolvedLinks = shownLinks(detail).filter((edge) => (edge.fromCaseId === detail.case.caseId ? edge.toCaseId : edge.fromCaseId) === null).length
  return {
    case: detail.case,
    hearings: hearingRows(detail),
    appeals: [...detail.appeals]
      .sort((a, b) => byDateDescending(a.appealDeclaredAt, b.appealDeclaredAt) || b.appealIndex - a.appealIndex)
      .map((appeal) => ({ index: appeal.appealIndex, declaredOn: appeal.appealDeclaredAt, type: appeal.appealType })),
    parties: partyGroups(detail),
    partyCount: detail.parties.length,
    personPartyCount: detail.personPartyCount,
    laws: lawRows(detail),
    related: relatedCases,
    relatedUnlisted: related.status === 'read' ? ids.length - relatedCases.length + unresolvedLinks : related.status === 'failed' ? ids.length + unresolvedLinks : unresolvedLinks,
    asOf: detail.asOf.asOf,
    partial: related.status === 'failed',
  }
}
