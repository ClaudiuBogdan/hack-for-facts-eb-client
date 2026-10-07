import { describe, expect, it } from 'vitest'
import type { JudicialCaseDetail } from '@/schemas/judicial'
import { FIXTURE_CASE, caseDetailFixture, caseSheetFixture } from '../fixtures/judicial-fixtures'
import { actCitationLabel, hearingRows, lawRows, otherCaseIds, partyGroups } from './case-model'

const detail = caseDetailFixture()

function withDetail(patch: Partial<JudicialCaseDetail>): JudicialCaseDetail {
  return { ...detail, ...patch }
}

describe('caseSheetOf', () => {
  it('reads the case by its court and number, with its hearing, appeal and the same file at the tribunal', () => {
    const sheet = caseSheetFixture()
    expect(sheet.case).toMatchObject({ institutionCode: FIXTURE_CASE.code, caseNumber: FIXTURE_CASE.number })
    expect(sheet.hearings).toHaveLength(1)
    expect(sheet.hearings[0]?.document).toEqual({ number: '75/2024', date: '2024-03-22' })
    expect(sheet.appeals).toEqual([{ index: 0, declaredOn: '2023-12-15', type: 'Apel' }])
    expect(sheet.related).toEqual([
      expect.objectContaining({ institutionCode: 'TribunalulCONSTANTA', caseNumber: '5180/118/2021', status: 'candidate' }),
    ])
    expect(sheet.relatedUnlisted).toBe(0)
    expect(sheet.partial).toBe(false)
  })

  it('counts the links it could not read, and is partial, when the related read failed', () => {
    const sheet = caseSheetFixture('failed')
    expect(sheet.related).toEqual([])
    expect(sheet.relatedUnlisted).toBe(1)
    expect(sheet.partial).toBe(true)
  })
})

describe('hearingRows', () => {
  it('lists the newest first and calls a hearing after the capture scheduled', () => {
    const rows = hearingRows(
      withDetail({
        hearings: [
          { hearingIndex: 0, hearingAt: '2024-03-22T09:00:00.000Z', panel: 'C3', pronouncementDate: null, documentNumber: null, documentDate: null },
          { hearingIndex: 1, hearingAt: '2026-09-01T09:00:00.000Z', panel: 'C3', pronouncementDate: null, documentNumber: null, documentDate: null },
          { hearingIndex: 2, hearingAt: null, panel: null, pronouncementDate: null, documentNumber: null, documentDate: null },
        ],
      }),
    )
    expect(rows.map((row) => [row.index, row.scheduled])).toEqual([
      [1, true],
      [0, false],
      [2, false],
    ])
  })
})

describe('partyGroups', () => {
  it('counts parties by role and kind, the legal forms beside their own kind', () => {
    const groups = partyGroups(
      withDetail({
        parties: [
          { partyIndex: 0, partyKind: 'company', roleNormalized: 'reclamant', legalForm: 'SRL' },
          { partyIndex: 1, partyKind: 'person', roleNormalized: 'parat', legalForm: null },
          { partyIndex: 2, partyKind: 'company', roleNormalized: 'parat', legalForm: 'SA' },
          { partyIndex: 3, partyKind: 'person', roleNormalized: 'parat', legalForm: null },
        ],
      }),
    )
    expect(groups).toEqual([
      { role: 'reclamant', total: 1, kinds: [{ kind: 'company', count: 1, legalForms: [{ form: 'SRL', count: 1 }] }] },
      {
        role: 'parat',
        total: 3,
        kinds: [
          { kind: 'company', count: 1, legalForms: [{ form: 'SA', count: 1 }] },
          { kind: 'person', count: 2, legalForms: [] },
        ],
      },
    ])
  })

  it('never shows a sole-trader form, which would point at a person', () => {
    const groups = partyGroups(withDetail({ parties: [{ partyIndex: 0, partyKind: 'company', roleNormalized: 'parat', legalForm: 'P.F.A.' }] }))
    expect(groups[0]?.kinds[0]?.legalForms).toEqual([])
  })
})

describe('lawRows', () => {
  it('names a resolved act as the registry cites it and links it; keeps what did not resolve as cited', () => {
    const rows = lawRows(
      withDetail({
        legalReferences: [
          ...detail.legalReferences,
          { ...detail.legalReferences[0]!, caseLegalReferenceId: '9', articleFragment: 'art. 66' },
          { ...detail.legalReferences[0]!, caseLegalReferenceId: '10', citation: 'art.336 ncp', actType: null, actNumber: null, actYear: null, targetActId: null },
        ],
      }),
    )
    expect(rows).toEqual([
      { key: 'act:56661', label: 'Legea nr. 85/2014', actId: '56661', articles: ['art. 66'], code: null },
      { key: 'citation:art.336 ncp', label: 'art.336 ncp', actId: null, articles: [], code: 'ncp' },
    ])
  })

  it('writes an act as the registry does, or not at all', () => {
    expect(actCitationLabel({ actType: 'oug', actNumber: '195', actYear: 2002 })).toBe('OUG nr. 195/2002')
    expect(actCitationLabel({ actType: 'decizie', actNumber: '1', actYear: 2020 })).toBeNull()
  })
})

describe('otherCaseIds', () => {
  it('takes the other end of each link once, leaving out links with none', () => {
    const own = detail.case.caseId
    const ids = otherCaseIds(
      withDetail({
        lineage: [
          { fromCaseId: own, toCaseId: '7', lineageType: 'same_dossier_cross_institution', confidenceScore: '0.600', validationStatus: 'candidate' },
          { fromCaseId: '7', toCaseId: own, lineageType: 'same_dossier_cross_institution', confidenceScore: '0.600', validationStatus: 'candidate' },
          { fromCaseId: own, toCaseId: null, lineageType: 'same_dossier_cross_institution', confidenceScore: '0.300', validationStatus: 'needs_review' },
        ],
      }),
    )
    expect(ids).toEqual(['7'])
  })

  it('lists only the same file at another court, as a candidate or awaiting review — never a rejected link or another kind', () => {
    const own = detail.case.caseId
    const edge = (toCaseId: string, lineageType: string, validationStatus: string) => ({ fromCaseId: own, toCaseId, lineageType, confidenceScore: null, validationStatus })
    const ids = otherCaseIds(
      withDetail({
        lineage: [
          edge('1', 'same_dossier_cross_institution', 'candidate'),
          edge('2', 'same_dossier_cross_institution', 'needs_review'),
          edge('3', 'same_dossier_cross_institution', 'rejected'),
          edge('4', 'old_number', 'candidate'),
          edge('5', 'appeal', 'accepted'),
        ],
      }),
    )
    expect(ids).toEqual(['1', '2'])
  })
})
