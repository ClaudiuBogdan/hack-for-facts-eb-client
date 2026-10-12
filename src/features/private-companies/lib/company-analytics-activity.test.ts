import { describe, expect, it } from 'vitest'
import { CompanyAnalysisBreakdownZ, CompanyAnalysisRecordZ, CompanyAnalysisReleaseZ, type CompanyAnalysisBreakdown } from '@/schemas/company-analytics'
import { apiScopeOf, isCapabilityRefused, isReleaseRefused } from '../api/company-analytics-api'
import { activity, activityBreakdownFixture, bucket, breakdownFixture, recordNode, recordsFixture, releaseFixture, releaseV3Fixture } from '../api/company-analytics.fixture'
import { planBreakdown, resolveQuestion } from '../api/company-analytics-plan'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { drillScope, nextDimension } from './company-analytics-drill'
import { breakdownCsv, recordsCsv } from './company-analytics-export'
import { scopeChips } from './company-analytics-scope-text'
import { analyticsSearchOf, DEFAULT_STATE, searchOf, stateOf, urlSearchOf } from './company-analytics-url'
import { activityTail, breakdownRows, groupLabel } from './company-analytics-view'

/**
 * The derived activity (v3) on the analysis and the hub: its address
 * (`dupa=activitate`, `activitate=onrc:rev2:6201`, `activitate_baza=…`), its
 * drill to the exact activity, its unclassified buckets never ranked, its
 * CSV columns — and a v2 release asking nothing of it, the hub on its main
 * activity exactly as before.
 */

describe('the address', () => {
  it('reads and writes the grouping, the exact activities and the bases, in a canonical order', () => {
    const state = stateOf(analyticsSearchOf({ dupa: 'activitate', activitate: 'anaf:6201,onrc:rev2:6201,ONRC:REV3:4711,anaf:6201', activitate_baza: 'fara-selectie,onrc-unica' }))
    expect(state.unread).toEqual([])
    expect(state.dimension).toBe('ACTIVITY')
    expect(state.scope.activity).toEqual([
      { source: 'ANAF', code: '6201' },
      { source: 'ONRC', code: '6201', revision: 'rev2' },
      { source: 'ONRC', code: '4711', revision: 'rev3' },
    ])
    expect(state.scope.activityBasis).toEqual(['ONRC_SINGLE_CLASS', 'NO_QUALIFIED_SELECTION'])
    expect(searchOf(state)).toEqual({ dupa: 'activitate', activitate: 'anaf:6201,onrc:rev2:6201,onrc:rev3:4711', activitate_baza: 'onrc-unica,fara-selectie' })
    // Round trip: the written address reads back as the same question.
    expect(stateOf(analyticsSearchOf(urlSearchOf(state)))).toEqual(state)
  })

  it('never reads a revision for ANAF, an ONRC code without one, or an unknown basis', () => {
    for (const token of ['anaf:rev2:6201', 'onrc:6201', 'onrc:rev9:6201', 'anaf:62', 'caen:6201']) {
      const state = stateOf(analyticsSearchOf({ activitate: token }))
      expect(state.scope.activity).toBeUndefined()
      expect(state.unread).toEqual(['activitate'])
    }
    expect(stateOf(analyticsSearchOf({ activitate_baza: 'principala' })).unread).toEqual(['activitate_baza'])
  })

  it('takes an ANAF selector to the API without a revision', () => {
    expect(apiScopeOf({ activity: [{ source: 'ANAF', code: '6201', revision: 'rev2' }, { source: 'ONRC', code: '6201', revision: 'rev2' }], activityBasis: ['ANAF_FISCAL_CODE'] })).toEqual({
      activity: [
        { source: 'ANAF', code: '6201' },
        { source: 'ONRC', code: '6201', revision: 'rev2' },
      ],
      activityBasis: ['ANAF_FISCAL_CODE'],
    })
  })

  it('names the filters as derived, ANAF without a revision', () => {
    const chips = scopeChips({ activity: [{ source: 'ONRC', code: '6201', revision: 'rev2' }, { source: 'ANAF', code: '4711' }], activityBasis: ['ANAF_FISCAL_CODE'] }, 'ro')
    expect(chips.map((chip) => chip.text)).toEqual(['activitate selectată (derivată): 6201 (ONRC Rev.2), 4711 (ANAF, revizie nepublicată)', 'selecția activității: cod CAEN fiscal ANAF'])
  })
})

describe('the drill', () => {
  const breakdown = activityBreakdownFixture()
  const [onrc, , anaf] = breakdown.groups
  const [multiple, uncatalogued, none] = breakdown.unclassified ?? []

  it('narrows to the exact activity: ONRC with its revision (both ONRC bases), ANAF without one', () => {
    expect(drillScope({ filing: 'FILED' }, 'ACTIVITY', onrc!)).toEqual({ filing: 'FILED', activity: [{ source: 'ONRC', code: '6201', revision: 'rev2' }] })
    expect(drillScope({}, 'ACTIVITY', anaf!)).toEqual({ activity: [{ source: 'ANAF', code: '4711' }] })
  })

  it('narrows an unclassified bucket to its basis, never to a code', () => {
    expect(drillScope({}, 'ACTIVITY', multiple!)).toEqual({ activityBasis: ['ONRC_MULTIPLE_CLASSES'] })
    expect(drillScope({}, 'ACTIVITY', uncatalogued!)).toEqual({ activityBasis: ['ANAF_FISCAL_UNCATALOGUED'] })
    expect(drillScope({}, 'ACTIVITY', none!)).toEqual({ activityBasis: ['NO_QUALIFIED_SELECTION'] })
  })

  it('reads the key when a bucket carries no activity, and drills nothing for „other" or the total', () => {
    expect(drillScope({}, 'ACTIVITY', bucket('GROUP', 'onrc:rev3:4711', '1.00'))).toEqual({ activity: [{ source: 'ONRC', code: '4711', revision: 'rev3' }] })
    expect(drillScope({}, 'ACTIVITY', bucket('GROUP', 'anaf:4711', '1.00'))).toEqual({ activity: [{ source: 'ANAF', code: '4711' }] })
    expect(drillScope({}, 'ACTIVITY', bucket('GROUP', '(no_qualified_selection)', '1.00'))).toEqual({ activityBasis: ['NO_QUALIFIED_SELECTION'] })
    expect(drillScope({}, 'ACTIVITY', breakdown.other)).toBeNull()
    expect(drillScope({}, 'ACTIVITY', breakdown.totals)).toBeNull()
  })

  it('never moves on to the derived activity by itself (a release may not offer it)', () => {
    expect(nextDimension('ACTIVITY', { activity: [{ source: 'ONRC', code: '6201', revision: 'rev2' }] })).toBe('COUNTY')
    expect(nextDimension('MAIN_CAEN', { mainCaen: [{ code: '6201' }], county: { in: ['CJ'] }, uat: { in: ['1'] } })).toBe('LEGAL_FORM')
  })
})

describe('the rows', () => {
  it('ranks the named activities only; the unclassified follow, apart, adding up to the total', () => {
    const breakdown = activityBreakdownFixture()
    const { ranked, rest, tail } = breakdownRows(breakdown)
    const rows = [...ranked, ...rest, ...tail]
    expect(rows.map((row) => row.key ?? row.kind)).toEqual(['onrc:rev2:6201', 'onrc:rev3:6201', 'anaf:4711', 'OTHER', '(onrc_multiple_classes)', '(anaf_fiscal_uncatalogued)', '(no_qualified_selection)'])
    expect(rows.reduce((sum, row) => sum + Number(row.metric?.sum ?? 0), 0)).toBe(Number(breakdown.totals.metric?.sum))
    expect(rows.map((row) => groupLabel('ACTIVITY', row))).toEqual([
      '6201 · Activități de realizare a soft-ului la comandă (software orientat client)',
      '6201 · Activități de programare a calculatoarelor',
      '4711 · Comerț cu amănuntul în magazine nespecializate (revizie nepublicată)',
      'Încă un grup',
      'Mai multe activități clasificate ONRC, niciuna selectată',
      'Cod CAEN fiscal ANAF necatalogat (observație din sursă, nu un domeniu)',
      'Fără selecție calificată (nu înseamnă fără activitate)',
    ])
  })

  it('keeps an unclassified bucket out of the ranked rows wherever the answer put it', () => {
    const misplaced = activityBreakdownFixture({ groups: [...activityBreakdownFixture().groups, bucket('GROUP', '(onrc_multiple_classes)', '5.00', { activity: activity({ basis: 'ONRC_MULTIPLE_CLASSES', code: null, revision: null }) })], unclassified: [] })
    expect(activityTail(misplaced).map((row) => row.key)).toEqual(['(onrc_multiple_classes)'])
    expect(breakdownRows(misplaced).ranked.map((row) => row.key)).toEqual(['onrc:rev2:6201', 'onrc:rev3:6201', 'anaf:4711'])
  })
})

describe('the release’s capabilities', () => {
  it('a v2 release cannot take the activity filters or grouping: said, and not asked', () => {
    const v2 = releaseFixture()
    const question = resolveQuestion({ ...DEFAULT_STATE, scope: { activity: [{ source: 'ANAF', code: '6201' }], activityBasis: ['ANAF_FISCAL_CODE'] } }, v2)
    expect(question.activity).toBe(false)
    expect(question.problems).toEqual([
      { kind: 'capability', field: 'activitate' },
      { kind: 'capability', field: 'activitate_baza' },
    ])
    expect(planBreakdown(resolveQuestion(DEFAULT_STATE, v2), 'ACTIVITY', 25).enabled).toBe(false)
    expect(planBreakdown(resolveQuestion(DEFAULT_STATE, releaseV3Fixture()), 'ACTIVITY', 25).enabled).toBe(true)
    expect(resolveQuestion({ ...DEFAULT_STATE, scope: { activity: [{ source: 'ANAF', code: '6201' }] } }, releaseV3Fixture()).problems).toEqual([])
  })

  it('tells a typed capability refusal apart from a withdrawn release', () => {
    const refusal = new GraphQLRequestError('no activity', { graphQLErrors: [{ message: 'no activity', extensions: { code: 'RELEASE_CAPABILITY_UNAVAILABLE' } }] })
    expect(isCapabilityRefused(refusal)).toBe(true)
    expect(isReleaseRefused(refusal)).toBe(false)
    expect(isCapabilityRefused(new GraphQLRequestError('x', { graphQLErrors: [{ message: 'x', extensions: { code: 'INVALID_INPUT', field: 'release' } }] }))).toBe(false)
    // The server's exact shape: the type is PascalCase; the code decides.
    const served = new GraphQLRequestError('no', {
      graphQLErrors: [{ message: 'no', extensions: { code: 'RELEASE_CAPABILITY_UNAVAILABLE', type: 'ReleaseCapabilityUnavailable', field: 'dimension', capability: 'ACTIVITY', releaseId: '7', schemaVersion: 'companies-analytics-ch-v2' } }],
    })
    expect(isCapabilityRefused(served)).toBe(true)
    expect(isReleaseRefused(served)).toBe(false)
  })
})

describe('the files', () => {
  it('writes the activity columns for the derived grouping, the unclassified buckets marked, ANAF without a revision', () => {
    const lines = breakdownCsv(activityBreakdownFixture()).split('\r\n')
    const header = lines[0]!.split(',')
    expect(header.slice(-12)).toEqual([
      'unclassified',
      'activity_basis',
      'activity_source',
      'activity_code',
      'activity_revision',
      'activity_description_status',
      'activity_descriptions',
      'numeric_match_selected',
      'incomplete_coverage',
      'with_unqualified_rows',
      'anaf_observed_from',
      'anaf_observed_to',
    ])
    const cell = (line: number, column: string) => lines[line]!.split(',')[header.indexOf(column)]
    // groups (3), other, unclassified (3), unknown, totals
    expect(lines).toHaveLength(1 + 3 + 1 + 3 + 1 + 1)
    expect([cell(1, 'activity_source'), cell(1, 'activity_revision'), cell(1, 'numeric_match_selected'), cell(1, 'unclassified')]).toEqual(['ONRC', 'rev2', '3', 'false'])
    expect([cell(3, 'activity_source'), cell(3, 'activity_code'), cell(3, 'activity_revision')]).toEqual(['ANAF', '4711', ''])
    expect([cell(5, 'key'), cell(5, 'unclassified'), cell(5, 'activity_basis')]).toEqual(['(onrc_multiple_classes)', 'true', 'ONRC_MULTIPLE_CLASSES'])
  })

  it('leaves a v2 file as it was', () => {
    expect(breakdownCsv(breakdownFixture()).split('\r\n')[0]).not.toContain('activity')
    const question = resolveQuestion(DEFAULT_STATE, releaseFixture())
    expect(recordsCsv(recordsFixture(), question).split('\r\n')[0]).not.toContain('activity')
  })

  it('writes each company’s selection on a v3 release', () => {
    const question = resolveQuestion(DEFAULT_STATE, releaseV3Fixture())
    const records = recordsFixture({
      edges: [
        {
          cursor: 'c1',
          node: recordNode('1', '10.00', 'REPORTED', true, {
            activity: activity({ source: 'ANAF', basis: 'ANAF_FISCAL_CODE', revision: 'rev2', code: '4711', label: null, descriptionStatus: 'MISSING' }),
            onrcClassKeyCount: 0,
            onrcUnqualifiedRowCount: 1,
            anafCaenForm: 'four_digit',
            anafOnrcAgreement: 'no_class_key',
            anafStatusDate: '2026-05-16',
          }),
        },
      ],
    })
    const [header, row] = recordsCsv(records, question).split('\r\n')
    const columns = header!.split(',')
    const cells = row!.split(',')
    const at = (column: string) => cells[columns.indexOf(column)]
    expect([at('activity_basis'), at('activity_source'), at('activity_code'), at('activity_revision'), at('onrc_class_key_count'), at('onrc_unqualified_row_count'), at('anaf_caen_form'), at('anaf_onrc_agreement'), at('anaf_status_date')]).toEqual([
      'ANAF_FISCAL_CODE',
      'ANAF',
      '4711',
      '',
      '0',
      '1',
      'four_digit',
      'no_class_key',
      '2026-05-16',
    ])
  })
})

describe('the schemas', () => {
  it('accept a v3 release and still a v2 one, never another', () => {
    expect(CompanyAnalysisReleaseZ.parse(releaseV3Fixture()).schemaVersion).toBe('companies-analytics-ch-v3')
    expect(CompanyAnalysisReleaseZ.parse(releaseFixture()).schemaVersion).toBe('companies-analytics-ch-v2')
    expect(() => CompanyAnalysisReleaseZ.parse({ ...releaseFixture(), schemaVersion: 'companies-analytics-ch-v4' })).toThrow()
  })

  it('accept answers without the v3 fields (an older API, another dimension)', () => {
    const { unclassified: _unclassified, ...v2 }: CompanyAnalysisBreakdown = breakdownFixture()
    expect(CompanyAnalysisBreakdownZ.parse(v2).unclassified).toBeUndefined()
    expect(CompanyAnalysisBreakdownZ.parse(activityBreakdownFixture()).unclassified).toHaveLength(3)
    const record = CompanyAnalysisRecordZ.parse(recordNode('1', null, null, false))
    expect(record.activity).toBeUndefined()
  })
})
