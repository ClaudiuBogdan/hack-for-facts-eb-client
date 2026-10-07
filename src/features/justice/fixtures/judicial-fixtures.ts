import type { JudicialCaseDetail } from '@/schemas/judicial'
import { caseloadOf } from '../api/judicial-analysis-api'
import { caseDetailOf, relatedReadOf } from '../api/judicial-case-api'
import { childrenReadOf, courtReadsOf } from '../api/judicial-court-api'
import { caseloadKey, type AnalysisSeed, type Caseload, type CaseloadRead } from '../lib/analysis-plans'
import { caseSheetOf, otherCaseIds, type CaseSheet } from '../lib/case-model'
import { courtSheetOf, type CourtSheet } from '../lib/court-model'
import analysisReads from './analysis-reads.json'
import casePage from './case-page.json'
import caseRelated from './case-related.json'
import courtChildren from './court-children.json'
import courtPage from './court-page.json'

/**
 * The judicial API's recorded answers (`scripts/record-justice-fixtures.ts`)
 * and the sheets the pages build from them, for the tests. Never edited by
 * hand: a test that needs another shape derives it from these.
 */

export const FIXTURE_COURT = 'TribunalulSALAJ'
export const FIXTURE_YEAR = 2025
export const FIXTURE_CASE = { code: 'CurteadeApelCONSTANTA', number: '5180/118/2021/a3' } as const

export const rawCourtPage = courtPage as Record<string, unknown>
export const rawCourtChildren = courtChildren as Record<string, unknown>
export const rawCasePage = casePage as Record<string, unknown>
export const rawCaseRelated = caseRelated as Record<string, unknown>

export function courtSheetFixture(children: 'read' | 'failed' = 'read'): CourtSheet {
  const reads = courtReadsOf(rawCourtPage, FIXTURE_YEAR)
  if (reads === null) throw new Error('the court fixture holds no court')
  return courtSheetOf({ ...reads, children: children === 'read' ? childrenReadOf(rawCourtChildren) : { status: 'failed' } })
}

export function caseDetailFixture(): JudicialCaseDetail {
  const detail = caseDetailOf(rawCasePage)
  if (detail === null) throw new Error('the case fixture holds no case')
  return detail
}

/**
 * The analysis page's reads for two questions — the bare page, and the
 * contentious-administrative cases by stage — each with the API's answer.
 */
export const analysisFixtureReads: readonly (CaseloadRead & { readonly answer: Caseload })[] = (analysisReads as readonly (CaseloadRead & { readonly data: unknown })[]).map(({ data, ...read }) => ({ ...read, answer: caseloadOf(data) }))

/** Those reads as the server seeds them, by the page's query keys. */
export function analysisSeedFixture(): AnalysisSeed {
  return analysisFixtureReads.map((read) => ({ key: caseloadKey({ groupBy: read.groupBy, filter: read.filter }), data: read.answer }))
}

export function caseSheetFixture(related: 'read' | 'failed' = 'read', detail: JudicialCaseDetail = caseDetailFixture()): CaseSheet {
  return caseSheetOf(detail, related === 'read' ? relatedReadOf(rawCaseRelated, otherCaseIds(detail)) : { status: 'failed' })
}
