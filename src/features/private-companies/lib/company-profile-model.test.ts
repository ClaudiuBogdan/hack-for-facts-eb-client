import { describe, expect, it } from 'vitest'
import { admittedQualification } from '../mocks/fixtures/qualification'
import { mockRegistryEvidence } from '../mocks/fixtures/registry'
import { buildCompanyProfileModel, displayCompanyName, placeLabel, sizeClassOf } from './company-profile-model'
import { companySentence } from './company-profile-text'
import { companyProfile, financialYear } from './company-profile.fixture'
import { notAssessed, qualifiedNet } from './financial-qualification'

/**
 * The model is what keeps the page honest for any company: a gap in the
 * statements stays a gap, money without an amount is counted and never summed
 * as zero, a commitment is never a payment, a registry status is the
 * edition's consensus or says why there is none, and no share of a static
 * total is computed at all.
 */

describe('displayCompanyName', () => {
  it('writes a registry name in capitals the way a heading reads it', () => {
    expect(displayCompanyName('OMV PETROM SA')).toBe('OMV Petrom SA')
    expect(displayCompanyName('PROFI ROM FOOD SRL')).toBe('Profi ROM Food SRL')
    expect(displayCompanyName('66 JACK SRL')).toBe('66 Jack SRL')
  })

  it('keeps initials, dotted forms and ampersands as written, and function words lower case', () => {
    expect(displayCompanyName('A & B IDEATICA S.R.L.')).toBe('A & B Ideatica S.R.L.')
    expect(displayCompanyName('SOCIETATEA NAŢIONALĂ DE TRANSPORT GAZE NATURALE TRANSGAZ SA')).toBe(
      'Societatea Națională de Transport Gaze Naturale Transgaz SA',
    )
  })

  it('capitalises each part of a hyphenated name, in comma-below letters', () => {
    expect(displayCompanyName('ABC-CON-INTERNAŢIONAL SRL')).toBe('ABC-CON-Internațional SRL')
  })
})

describe('placeLabel', () => {
  it('drops the kind of locality and names the county only when it adds something', () => {
    expect(placeLabel('Municipiul Botoşani', 'Botoşani')).toBe('Botoșani')
    expect(placeLabel('Municipiul Gherla', 'Cluj')).toBe('Gherla, Cluj')
    expect(placeLabel('Bucureşti Sectorul 1', 'Bucureşti')).toBe('București, Sectorul 1')
  })

  it('falls back to the county, and to nothing', () => {
    expect(placeLabel(null, 'Cluj')).toBe('Cluj')
    expect(placeLabel(null, null)).toBeNull()
  })
})

describe('qualifiedNet', () => {
  it('reads the evaluator’s net: a loss beside a zero profit, a reported zero, and nothing when neither side is reported', () => {
    expect(qualifiedNet(financialYear(2024, { netProfit: 0, netLoss: 1200 }))).toBe(-1200)
    expect(qualifiedNet(financialYear(2024, { netProfit: 5000, netLoss: null }))).toBe(5000)
    expect(qualifiedNet(financialYear(2024, { netProfit: 0, netLoss: 0 }))).toBe(0)
    expect(qualifiedNet(financialYear(2024))).toBeNull()
  })
})

/** The model's listing of one statement's published values. */
function statementOf(model: ReturnType<typeof buildCompanyProfileModel>, year: number) {
  const statement = model.qualification.statements.find((entry) => entry.year === year)
  if (!statement) throw new Error(`no statement ${String(year)}`)
  return statement
}

/** A statement as the evaluator held it: these statuses over the admitted defaults. */
function heldYear(fiscalYear: number, values: Parameters<typeof financialYear>[1], statuses: Parameters<typeof admittedQualification>[1], holdReason: string | null = null) {
  const base = financialYear(fiscalYear, values)
  return { ...base, qualification: { ...admittedQualification(base, statuses), holdReason } }
}

describe('only reported values reach a figure (CD-14)', () => {
  it('a held value is a gap in every series, kept with its exact text and reason', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        financials: [
          financialYear(2019, { turnover: 1_000, employees: 3 }),
          heldYear(2020, { netProfit: 291_000_000_000_000, turnover: 300_000_000_000_000, employees: 3 }, { net_profit: 'held_observation', net_result: 'held_component', turnover: 'held_observation' }, 'reviewed: keyed 1,000,000x'),
          financialYear(2021, { turnover: 1_100, employees: 4 }),
        ],
      }),
    )
    expect(model.series.turnover.map((point) => point.value)).toEqual([1_000, null, 1_100])
    expect(model.series.netResult.map((point) => point.value)).toEqual([null, null, null])
    // One held metric does not take the statement's other reported values with it.
    expect(model.series.employees.map((point) => point.value)).toEqual([3, 3, 4])
    // An older year's hold stays listed, exactly as published, with its reason.
    const held = statementOf(model, 2020)
    expect(held.values).toContainEqual({ metric: 'turnover', original: '300000000000000', status: 'held_observation' })
    expect(held.holdReason).toBe('reviewed: keyed 1,000,000x')
    expect(held.keptOut).toBe(2)
    expect(model.qualification.policy).toEqual({ approvedOn: '2026-10-02', version: 'companies-analytics-admission-2026-10-02-q1' })
  })

  it('a 464d-like statement shows its reported profit as a source value, its net held with no value, and no derived net, loss or size', () => {
    for (const financials of [
      // Newest, and older than the newest.
      [heldYear(2024, { netProfit: 120, employees: 7 }, { gross_loss: 'held_profile', net_loss: 'missing', net_result: 'held_profile' })],
      [
        heldYear(2023, { netProfit: 120, employees: 7 }, { gross_loss: 'held_profile', net_loss: 'missing', net_result: 'held_profile' }),
        financialYear(2024, { netProfit: 50, employees: 8 }),
      ],
    ]) {
      const model = buildCompanyProfileModel(companyProfile({ financials }))
      const fourSixFour = statementOf(model, financials[0]!.fiscalYear)
      // The published component, reported, beside the derived result, held — never „120 − 0".
      expect(fourSixFour.values).toContainEqual({ metric: 'net_profit', original: '120', status: 'reported' })
      expect(fourSixFour.netResult).toEqual({ status: 'held_profile', value: null })
      expect(model.series.netResult[0]?.value).toBeNull()
      expect(model.lossYears).toBe(0)
    }
    const single = buildCompanyProfileModel(
      companyProfile({ financials: [heldYear(2024, { netProfit: 120, employees: 7 }, { gross_loss: 'held_profile', net_loss: 'missing', net_result: 'held_profile' })] }),
    )
    expect(single.sizeClass).toBe('micro')
  })

  it('keeps every published value of every year inspectable, whatever its status (D1-C01)', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        financials: [
          { ...financialYear(2019, { turnover: 11, employees: 2 }), qualification: notAssessed('qualification_unavailable') },
          heldYear(2020, { turnover: 12 }, { turnover: 'held_profile' }),
          heldYear(2021, { turnover: 13 }, { turnover: 'held_quality' }),
          heldYear(2022, { turnover: 14 }, { turnover: 'not_admitted' }),
          financialYear(2023, { turnover: 15, employees: 3 }),
        ],
      }),
    )
    expect(model.qualification.statements.map((statement) => statement.year)).toEqual([2023, 2022, 2021, 2020, 2019])
    expect(
      model.qualification.statements.map((statement) => [statement.year, statement.publisher, statement.notAssessed, statement.values.map((value) => [value.original, value.status])]),
    ).toEqual([
      [2023, 'anaf', null, [['15', 'reported'], ['3', 'reported']]],
      [2022, 'anaf', null, [['14', 'not_admitted']]],
      [2021, 'anaf', null, [['13', 'held_quality']]],
      [2020, 'anaf', null, [['12', 'held_profile']]],
      [2019, 'anaf', 'qualification_unavailable', [['11', null], ['2', null]]],
    ])
    // None of them is a point: only 2023 is plotted.
    expect(model.series.turnover.map((point) => point.value)).toEqual([null, null, null, null, 15])
    expect(statementOf(model, 2019).keptOut).toBe(2)
  })

  it('plots, trends and counts losses only on the newest assessed basis: another policy SHA or release is a gap, named (D1-C03)', () => {
    const years = [2021, 2022, 2023, 2024].map((year) => financialYear(year, { turnover: year, employees: year - 2000, netProfit: 0, netLoss: 1 }))
    for (const identity of [{ policySha256: 'b2'.repeat(32) }, { releaseId: '3' }]) {
      // The two newest on a new basis, the two oldest on the old one.
      const rebased = years.map((year) => (year.fiscalYear >= 2023 ? { ...year, qualification: { ...year.qualification, ...identity } } : year))
      const model = buildCompanyProfileModel(companyProfile({ financials: rebased }))
      expect(model.series.turnover.map((point) => point.value)).toEqual([null, null, 2023, 2024])
      expect(model.series.employees.map((point) => point.value)).toEqual([null, null, 23, 24])
      expect(model.series.netResult.map((point) => point.value)).toEqual([null, null, -1, -1])
      expect(model.recent.turnover).toEqual([null, null, 2023, 2024])
      expect(model.recent.employees).toEqual([null, null, 23, 24])
      expect(model.lossYears).toBe(2)
      expect(model.qualification.otherBasisYears).toEqual([2021, 2022])
      // Their source values stay listed, out of every figure.
      const old = statementOf(model, 2021)
      expect(old.otherBasis).toBe(true)
      expect(old.keptOut).toBe(old.values.length)
      expect(old.values).toContainEqual({ metric: 'turnover', original: '2021', status: 'reported' })
    }
  })

  it('takes the basis from the newest ASSESSED statement when the newest was not assessed', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        financials: [
          financialYear(2022, { turnover: 10 }),
          financialYear(2023, { turnover: 20 }),
          { ...financialYear(2024, { turnover: 30 }), qualification: notAssessed('no_active_policy') },
        ],
      }),
    )
    expect(model.series.turnover.map((point) => point.value)).toEqual([10, 20, null])
    expect(model.qualification.latestNotAssessed).toBe('no_active_policy')
    expect(model.qualification.policy).toEqual({ approvedOn: '2026-10-02', version: 'companies-analytics-admission-2026-10-02-q1' })
    expect(model.qualification.otherBasisYears).toEqual([])
    expect(statementOf(model, 2024).notAssessed).toBe('no_active_policy')
  })

  it('never uses a statement whose qualification is absent or not assessed', () => {
    const unassessed = { ...financialYear(2024, { employees: 300, netLoss: 5, turnover: 9_000 }), qualification: notAssessed('qualification_unavailable') }
    const model = buildCompanyProfileModel(companyProfile({ financials: [unassessed] }))
    expect(model.series.turnover.map((point) => point.value)).toEqual([null])
    expect(model.recent.turnover).toEqual([null])
    expect(model.sizeClass).toBeNull()
    expect(model.lossYears).toBe(0)
    expect(model.qualification.latestNotAssessed).toBe('qualification_unavailable')
    expect(model.qualification.policy).toBeNull()
    // Its source values stay inspectable, with no status and no derived net.
    const [statement] = model.qualification.statements
    expect(statement?.values.map((value) => [value.metric, value.original, value.status])).toEqual([
      ['turnover', '9000', null],
      ['net_loss', '5', null],
      ['employees', '300', null],
    ])
    expect(statement?.netResult).toBeNull()
    expect(statement?.keptOut).toBe(3)
  })

  it('compares two statements only under one policy', () => {
    const latest = financialYear(2024, { turnover: 2 })
    const previous = financialYear(2023, { turnover: 1 })
    expect(buildCompanyProfileModel(companyProfile({ financials: [previous, latest] })).comparable).toBe(true)
    const newPolicy = { ...latest, qualification: { ...latest.qualification, policySha256: 'b2'.repeat(32) } }
    const model = buildCompanyProfileModel(companyProfile({ financials: [previous, newPolicy] }))
    expect(model.comparable).toBe(false)
    // Nor on one scale: the older basis is a gap beside the newest.
    expect(model.series.turnover.map((point) => point.value)).toEqual([null, 2])
  })
})

describe('sizeClassOf', () => {
  it('counts people as the hub does', () => {
    expect([null, 0, 9, 10, 49, 50, 249, 250].map(sizeClassOf)).toEqual([null, 'none', 'micro', 'small', 'small', 'medium', 'medium', 'large'])
  })
})

describe('buildCompanyProfileModel', () => {
  it('keeps every year from the first statement to the last, the gaps as gaps', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        financials: [financialYear(2011, { turnover: 100 }), financialYear(2008, { turnover: 50 }), financialYear(2013, { turnover: 80, employees: 3 })],
      }),
    )
    expect(model.span).toEqual([2008, 2009, 2010, 2011, 2012, 2013])
    expect(model.missingYears).toEqual([2009, 2010, 2012])
    expect(model.series.turnover.map((point) => point.value)).toEqual([50, null, null, 100, null, 80])
    expect(model.latest?.fiscalYear).toBe(2013)
    // The year before the newest had no statement: nothing to compare with.
    expect(model.previous).toBeNull()
  })

  it('draws the head from the last five years with a statement, not the last five calendar years', () => {
    const years = [2010, 2011, 2012, 2013, 2014, 2015, 2019].map((year) => financialYear(year, { turnover: year, netProfit: 1, employees: 2 }))
    const model = buildCompanyProfileModel(companyProfile({ financials: years }), { now: new Date(2026, 9, 4) })
    expect(model.recent.years).toEqual([2012, 2013, 2014, 2015, 2019])
    // A newest statement more than two fiscal years behind the calendar is old news.
    expect(model.stale).toBe(true)
    expect(buildCompanyProfileModel(companyProfile({ financials: [financialYear(2024)] }), { now: new Date(2026, 9, 4) }).stale).toBe(false)
  })

  it('counts the years that ended in a loss', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        financials: [financialYear(2022, { netProfit: 0, netLoss: 10 }), financialYear(2023, { netProfit: 4 }), financialYear(2024, { netLoss: 3 })],
      }),
    )
    expect(model.lossYears).toBe(2)
  })

  it('has no figures at all for a company that never filed', () => {
    const model = buildCompanyProfileModel(companyProfile())
    expect(model.latest).toBeNull()
    expect(model.span).toEqual([])
    expect(model.recent.years).toEqual([])
    expect(model.sizeClass).toBeNull()
  })

  it('reads the registry status by its code', () => {
    const kind = (code: string) => buildCompanyProfileModel(companyProfile({ status: { code, label: 'x' } })).status.kind
    expect(kind('1048')).toBe('active')
    expect(kind('1084')).toBe('struck-off')
    expect(kind('1107')).toBe('insolvency')
    expect(kind('1049')).toBe('dissolution')
    expect(kind('9999')).toBe('other')
    // No consensus: never a guessed kind.
    expect(buildCompanyProfileModel(companyProfile({ status: null })).status).toEqual({ kind: 'unqualified', label: null })
  })

  it('keeps an „în funcțiune" observation beside a conflicting one a conflict, choosing neither', () => {
    const registry = mockRegistryEvidence({
      identifier: 'J16/44/1996',
      name: 'TRANSPORT OLTENIA SNC',
      legalForm: 'SNC',
      recordedDate: '1996-02-28',
      countyCode: 'DJ',
      countyName: 'Dolj',
      statusCodes: ['1048', '1070'],
      caen: [],
    })
    const model = buildCompanyProfileModel(companyProfile({ status: null, registry }))
    expect(model.status).toEqual({ kind: 'conflict', label: null })
    expect(model.activeObservation).toBe(true)
    expect(model.registry.identifiers[0]?.statusCodes).toEqual(['1048', '1070'])
  })

  it('carries the recorded date as the edition’s civil date with its basis, never as a year of founding', () => {
    const model = buildCompanyProfileModel(companyProfile())
    expect(model.recordedDate).toEqual({ value: '2007-11-26', basis: 'single_observation' })
    expect(model).not.toHaveProperty('foundedYear')
  })

  it('groups the authorised activities by revision and division, keeping every revision (CD-23)', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        caenActivities: [
          { code: '4711', rev: 'rev2', label: 'Comerț', source: 'onrc' },
          { code: '4719', rev: 'rev2', label: 'Alt comerț', source: 'onrc' },
          { code: '5610', rev: 'rev2', label: 'Restaurante', source: 'onrc' },
          { code: '4711', rev: 'rev1', label: 'Vechi', source: 'onrc' },
          { code: '4711', rev: null, label: 'ANAF', source: 'anaf' },
        ],
        fiscal: { vatPayer: true, inactive: false, anafFound: true, asOfDate: '2026-07-04', fiscalCaen: { code: '4711', rev: null } },
      }),
    )
    // Was: Rev.2 alone, the Rev.1 row dropped. Now both, the newest edition first; ANAF's row stays out.
    expect(model.activities.revision).toBeNull()
    expect(model.activities.total).toBe(4)
    expect(model.activities.byRevision).toEqual([
      { revision: 'rev2', count: 3 },
      { revision: 'rev1', count: 1 },
    ])
    expect(model.activities.groups.map((group) => [group.revision, group.division, group.activities.length])).toEqual([
      ['rev2', '47', 2],
      ['rev2', '56', 1],
      ['rev1', '47', 1],
    ])
    // ANAF gave no revision: no name of its own, the registry's meanings said as the registry's.
    expect(model.mainActivity).toMatchObject({
      code: '4711',
      revision: null,
      label: null,
      registry: [
        { revision: 'rev2', label: 'Comerț' },
        { revision: 'rev1', label: 'Vechi' },
      ],
    })
  })

  describe('a main activity is named only from its own CAEN revision (CD-09/CD-10)', () => {
    const activities = [
      { code: '6210', rev: 'rev3', label: 'Activități de realizare a soft-ului la comandă', source: 'onrc' as const },
      { code: '6210', rev: 'rev1', label: 'Transporturi aeriene regulate', source: 'onrc' as const },
      { code: '6210', rev: null, label: null, source: 'anaf' as const },
    ]
    const withFiscal = (rev: string | null) =>
      buildCompanyProfileModel(
        companyProfile({
          caenActivities: activities,
          fiscal: { vatPayer: null, inactive: null, anafFound: true, asOfDate: '2026-07-04', fiscalCaen: { code: '6210', rev } },
        }),
      ).mainActivity

    it('an unknown ANAF revision borrows no ONRC label, whatever the registry lists', () => {
      const main = withFiscal(null)
      expect(main?.label).toBeNull()
      // The registry's meanings of the same digits stay attributed to it, each with its own revision.
      expect(main?.registry).toEqual([
        { revision: 'rev3', label: 'Activități de realizare a soft-ului la comandă' },
        { revision: 'rev1', label: 'Transporturi aeriene regulate' },
      ])
      // No sector is derived from ANAF's code.
      expect(main).not.toHaveProperty('division')
    })

    it('a known revision is named from its own nomenclature only, and nothing else', () => {
      expect(withFiscal('rev1')?.label).toBe('Transporturi aeriene regulate')
      expect(withFiscal('rev3')?.label).toBe('Activități de realizare a soft-ului la comandă')
      // No Rev.2 row for 6210: no name, never the code dressed up as one.
      expect(withFiscal('rev2')?.label).toBeNull()
    })

    it('the one-line summary names ANAF’s activity only when its own revision does, and never a year', () => {
      // 66 Jack's ANAF 5610 has no revision; the registry's Rev.2 „Restaurante" is not ANAF's name.
      expect(companySentence(buildCompanyProfileModel(companyProfile()))).toBe('Societate cu răspundere limitată din Gherla, Cluj.')
      const rev2 = companyProfile({ fiscal: { ...companyProfile().fiscal, fiscalCaen: { code: '5610', rev: 'rev2' } } })
      expect(companySentence(buildCompanyProfileModel(rev2))).toBe(
        'Societate cu răspundere limitată din Gherla, Cluj. Activitatea principală declarată la ANAF: restaurante.',
      )
      // The recorded date is no founding year: no year, no „înregistrată în".
      expect(companySentence(buildCompanyProfileModel(rev2))).not.toMatch(/\d{4}|înregistrat|înființ/u)
    })
  })

  describe('every registry revision is kept, each in its own name (CD-23)', () => {
    const onrc = (code: string, rev: string | null, label: string | null) => ({ code, rev, label, source: 'onrc' as const })

    it('shows a company whose registry lists Rev.0 only', () => {
      const { activities } = buildCompanyProfileModel(
        companyProfile({
          caenActivities: [onrc('0111', 'rev0', 'Cultivarea cerealelor'), onrc('0112', 'rev0', 'Cultivarea legumelor'), onrc('5221', 'rev0', 'Comerț cu amănuntul')],
        }),
      )
      // Was: no revision and a total of 0.
      expect(activities.revision).toBe('rev0')
      expect(activities.total).toBe(3)
      expect(activities.groups.map((group) => [group.label, group.activities.map((activity) => [activity.code, activity.label])])).toEqual([
        [
          'Diviziunea 01 (CAEN Rev.0)',
          [
            ['0111', 'Cultivarea cerealelor'],
            ['0112', 'Cultivarea legumelor'],
          ],
        ],
        ['Diviziunea 52 (CAEN Rev.0)', [['5221', 'Comerț cu amănuntul']]],
      ])
    })

    it('keeps Rev.0 to Rev.3 and rows with no revision, the same digits apart in each, repeats included', () => {
      const { activities } = buildCompanyProfileModel(
        companyProfile({
          caenActivities: [
            onrc('6210', 'rev1', 'Transporturi aeriene regulate'),
            onrc('6210', 'rev3', 'Activități de realizare a soft-ului la comandă'),
            onrc('6210', 'rev3', 'Activități de realizare a soft-ului la comandă'),
            onrc('5610', 'rev2', 'Restaurante'),
            onrc('0111', 'rev0', 'Cultivarea cerealelor'),
            // No revision: a group of its own, never named, whatever label rode along.
            onrc('4711', null, 'Împrumutat'),
            { code: '6210', rev: null, label: null, source: 'anaf' },
          ],
        }),
      )
      expect(activities.revision).toBeNull()
      expect(activities.total).toBe(6)
      expect(activities.byRevision).toEqual([
        { revision: 'rev3', count: 2 },
        { revision: 'rev2', count: 1 },
        { revision: 'rev1', count: 1 },
        { revision: 'rev0', count: 1 },
        { revision: null, count: 1 },
      ])
      expect(activities.groups.map((group) => [group.revision, group.label, group.activities])).toEqual([
        [
          'rev3',
          'Diviziunea 62 (CAEN Rev.3)',
          [
            { code: '6210', label: 'Activități de realizare a soft-ului la comandă' },
            { code: '6210', label: 'Activități de realizare a soft-ului la comandă' },
          ],
        ],
        ['rev2', 'Restaurante și baruri', [{ code: '5610', label: 'Restaurante' }]],
        ['rev1', 'Diviziunea 62 (CAEN Rev.1)', [{ code: '6210', label: 'Transporturi aeriene regulate' }]],
        ['rev0', 'Diviziunea 01 (CAEN Rev.0)', [{ code: '0111', label: 'Cultivarea cerealelor' }]],
        [null, 'Diviziunea 47 (fără revizie CAEN)', [{ code: '4711', label: null }]],
      ])
      // One key per revision and division: 62 in Rev.3 and in Rev.1 never collide.
      const keys = activities.groups.map((group) => group.key)
      expect(new Set(keys).size).toBe(keys.length)
    })

    it('lists the registry meaning of the main activity in every revision, Rev.0 included, naming none for ANAF', () => {
      const main = buildCompanyProfileModel(
        companyProfile({
          caenActivities: [onrc('0111', 'rev0', 'Cultivarea cerealelor'), onrc('0111', 'rev2', 'Cultivarea cerealelor (Rev.2)'), onrc('0111', null, 'Împrumutat')],
          fiscal: { vatPayer: null, inactive: null, anafFound: true, asOfDate: '2026-07-04', fiscalCaen: { code: '0111', rev: null } },
        }),
      ).mainActivity
      expect(main?.label).toBeNull()
      expect(main?.registry).toEqual([
        { revision: 'rev2', label: 'Cultivarea cerealelor (Rev.2)' },
        { revision: 'rev0', label: 'Cultivarea cerealelor' },
      ])
    })
  })

  it('names a registry division only in its own revision: Rev.2 by name, other editions by number', () => {
    const groupsOf = (rev: string) =>
      buildCompanyProfileModel(
        companyProfile({ caenActivities: [{ code: '6210', rev, label: 'x', source: 'onrc' }] }),
      ).activities.groups.map((group) => group.label)
    expect(groupsOf('rev2')).toEqual(['Software și servicii IT'])
    // Rev.1 62 is air transport and Rev.3 62 is not the Rev.2 list: number and edition only.
    expect(groupsOf('rev1')).toEqual(['Diviziunea 62 (CAEN Rev.1)'])
    expect(groupsOf('rev3')).toEqual(['Diviziunea 62 (CAEN Rev.3)'])
  })

  it('keeps ANAF’s Rev.3 vehicle repair as ANAF’s code, with no retired snapshot grouping', () => {
    const model = buildCompanyProfileModel(
      companyProfile({ fiscal: { vatPayer: null, inactive: null, anafFound: true, asOfDate: '2026-07-04', fiscalCaen: { code: '9531', rev: 'rev3' } } }),
    )
    expect(model.mainActivity).toEqual({ code: '9531', revision: 'rev3', label: null, registry: [] })
  })

  it('names each statement publisher with its own years (CD-12)', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        financials: [
          financialYear(2024, { turnover: 1 }),
          financialYear(2008, { turnover: 1 }),
          financialYear(2018, { turnover: 1 }),
          financialYear(2019, { turnover: 1 }),
          financialYear(2016, { turnover: 1, sourceSystem: null }),
        ],
      }),
    )
    expect(model.statementSources).toEqual([
      { publisher: 'mfp', first: 2008, last: 2018 },
      { publisher: null, first: 2016, last: 2016 },
      { publisher: 'anaf', first: 2019, last: 2024 },
    ])
    expect(buildCompanyProfileModel(companyProfile()).statementSources).toEqual([])
  })

  it('keeps public money as the source split it: amounts summed, unvalued records counted, commitments apart', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        publicMoney: {
          totalRon: null,
          flowCount: 0,
          byFlowType: [
            { flowType: 'direct_acquisition', totalRon: 3_000, count: 4 },
            { flowType: 'procurement_contract', totalRon: 90_000, count: 2 },
            { flowType: 'pnrr_payment', totalRon: 0, count: 1 },
            { flowType: 'pnrr_commitment', totalRon: 500_000, count: 1 },
          ],
          byYear: [
            { year: 2020, flowType: 'procurement_contract', totalRon: 90_000, count: 2 },
            { year: 2023, flowType: 'direct_acquisition', totalRon: 2_000, count: 3 },
            { year: null, flowType: 'direct_acquisition', totalRon: 1_000, count: 1 },
            { year: 2023, flowType: 'pnrr_payment', totalRon: 0, count: 1 },
            { year: 2024, flowType: 'pnrr_commitment', totalRon: 500_000, count: 1 },
          ],
        },
      }),
    )
    const { money } = model
    expect(money.flows.map((flow) => [flow.flowType, flow.total, flow.receipt])).toEqual([
      ['procurement_contract', 90_000, true],
      ['direct_acquisition', 3_000, true],
      // A zero beside a count is a record with no published amount, not a free payment.
      ['pnrr_payment', null, true],
      ['pnrr_commitment', 500_000, false],
    ])
    expect(money.received).toBe(93_000)
    expect(money.receivedCount).toBe(7)
    expect(money.unvaluedCount).toBe(1)
    expect(money.commitments).toEqual({ total: 500_000, count: 1 })
    expect(money.undated).toEqual({ total: 1_000, count: 1, unvalued: 0 })
    // The commitment's year is not a year of payments; the years between are kept, empty.
    expect([money.firstYear, money.lastYear]).toEqual([2020, 2023])
    expect(money.byYear.map((year) => [year.year, year.contracts, year.direct, year.other, year.unvalued])).toEqual([
      [2020, 90_000, 0, 0, 0],
      [2021, 0, 0, 0, 0],
      [2022, 0, 0, 0, 0],
      [2023, 0, 2_000, 0, 1],
    ])
  })

  it('keeps a reversal in the sums: a negative amount is published, not missing', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        publicMoney: {
          totalRon: null,
          flowCount: 0,
          byFlowType: [{ flowType: 'pnrr_payment', totalRon: 500, count: 3 }],
          byYear: [
            { year: 2023, flowType: 'pnrr_payment', totalRon: 1_000, count: 2 },
            { year: 2024, flowType: 'pnrr_payment', totalRon: -500, count: 1 },
          ],
        },
      }),
    )
    expect(model.money.unvaluedCount).toBe(0)
    expect(model.money.byYear.map((year) => [year.year, year.other])).toEqual([
      [2023, 1_000],
      [2024, -500],
    ])
  })

  it('calls only the calendar year in progress a part of a year, never a company’s last active year', () => {
    const withMoneyTo = (year: number) =>
      companyProfile({
        publicMoney: {
          totalRon: null,
          flowCount: 0,
          byFlowType: [{ flowType: 'direct_acquisition', totalRon: 300, count: 2 }],
          byYear: [
            { year: 2019, flowType: 'direct_acquisition', totalRon: 100, count: 1 },
            { year, flowType: 'direct_acquisition', totalRon: 200, count: 1 },
          ],
        },
      })
    const now = new Date(2026, 8, 24)
    expect(buildCompanyProfileModel(withMoneyTo(2026), { now }).money.openYear).toBe(2026)
    // A company whose last contract was in 2023 has a whole 2023.
    expect(buildCompanyProfileModel(withMoneyTo(2023), { now }).money.openYear).toBeNull()
  })

  it('counts records with no amount from the flows when the source gives no years', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        publicMoney: {
          totalRon: null,
          flowCount: 0,
          byFlowType: [
            { flowType: 'pnrr_payment', totalRon: null, count: 3 },
            { flowType: 'direct_acquisition', totalRon: 500, count: 1 },
          ],
          byYear: [],
        },
      }),
    )
    expect(model.money.unvaluedCount).toBe(3)
    expect([model.money.firstYear, model.money.undated.count]).toEqual([null, 0])
  })

  it('writes the registry’s status and activity names in comma-below letters', () => {
    const model = buildCompanyProfileModel(
      companyProfile({
        status: { code: '1049', label: 'dizolvare judiciară conform Legii 31/1990 (fără lichidare) - radiere din oficiu - ş' },
        caenActivities: [{ code: '5610', rev: 'rev2', label: 'Restaurante şi baruri', source: 'onrc' }],
      }),
    )
    expect(model.status.label).toContain('ș')
    expect(model.mainActivity?.registry).toEqual([{ revision: 'rev2', label: 'Restaurante și baruri' }])
    expect(model.activities.groups[0]?.activities[0]?.label).toBe('Restaurante și baruri')
  })

  it('computes no share of sector, county or national totals: no edition-bound total exists (CD-14)', () => {
    const model = buildCompanyProfileModel(companyProfile({ financials: [financialYear(2025, { turnover: 5_000, employees: 5 })] }))
    expect(model.place).toEqual({ label: 'Gherla, Cluj', county: 'Cluj', countyCode: 'CJ' })
    expect(model).not.toHaveProperty('context')
  })
})
