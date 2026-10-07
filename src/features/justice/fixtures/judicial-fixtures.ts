import type { JudicialCaseDetail } from '@/schemas/judicial'
import { caseDetailOf, relatedReadOf } from '../api/judicial-case-api'
import { childrenReadOf, courtReadsOf } from '../api/judicial-court-api'
import { caseSheetOf, otherCaseIds, type CaseSheet } from '../lib/case-model'
import { courtSheetOf, type CourtSheet } from '../lib/court-model'
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

export function caseSheetFixture(related: 'read' | 'failed' = 'read', detail: JudicialCaseDetail = caseDetailFixture()): CaseSheet {
  return caseSheetOf(detail, related === 'read' ? relatedReadOf(rawCaseRelated, otherCaseIds(detail)) : { status: 'failed' })
}
