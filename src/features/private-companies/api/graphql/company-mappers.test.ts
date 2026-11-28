import { describe, expect, it, vi } from 'vitest'
import { FINANCIAL_METRICS, privateCompanyProfileSchema } from '@/schemas/private-company'
import { qualifiedNet, reportedNumber } from '../../lib/financial-qualification'
import {
  companyProfileResponseSchema,
  type CompanyProfileResponse,
  type RawCompanyFinancialYear,
  type RawStatementQualification,
} from './company-queries'
import { mapCompanyProfile } from './company-mappers'
import { mapRegistryEnvelope, type RawRegistryEnvelope, type RawRegistryEvidence } from './company-registry-graphql'

const PUBLISHED: RawRegistryEnvelope = {
  source: 'onrc',
  state: 'PUBLISHED',
  editionId: '7',
  sourceSnapshotId: 'firme-2026-09-30',
  sourcePublishedAt: '2026-09-30',
  interpretationVersion: 'onrc-interp-v1',
  dimensionPolicyVersion: 'onrc-dim-v1',
  eligibilityPolicyVersion: 'onrc-elig-v1',
  publicationEpoch: '3',
  accessEpoch: '11',
  reason: null,
  scopeKey: 'onrc:published:7:3:11',
}

const UNPUBLISHED: RawRegistryEnvelope = {
  ...PUBLISHED,
  state: 'UNPUBLISHED',
  editionId: null,
  sourceSnapshotId: null,
  sourcePublishedAt: null,
  publicationEpoch: null,
  reason: 'no ONRC edition is published',
  scopeKey: 'onrc:unpublished:-:-:11',
}

/** DEDEMAN's evidence as the profile asks for it: one identifier with its status, the qualified fields. */
const dedemanEvidence = (fields: Partial<RawRegistryEvidence> = {}): RawRegistryEvidence => ({
  registry: PUBLISHED,
  cuiState: 'IN_EDITION',
  profile: {
    legalForm: { value: 'SRL', basis: 'SINGLE_OBSERVATION' },
    recordedDate: { value: '1992-11-05', basis: 'SINGLE_OBSERVATION' },
    countyCode: { value: 'BC', basis: 'SINGLE_OBSERVATION' },
    uatSirutaCode: { value: '20297', basis: 'SINGLE_OBSERVATION' },
    statusCode: { value: '1048', basis: 'SINGLE_OBSERVATION' },
  },
  identifiers: [
    {
      id: '7:J1992002621040',
      identifierKey: 'J1992002621040',
      statusCodes: ['1048'],
      hasActiveObservation: true,
      countyCodes: ['BC'],
    },
  ],
  observationsTruncated: false,
  ...fields,
})

/** A trimmed DEDEMAN-shaped response (values cross-checked vs prod), in the API19 shape. */
const dedemanResponse: CompanyProfileResponse = {
  company: {
    cui: '2816464',
    orgId: '1517396',
    name: 'DEDEMAN SRL',
    nameSource: 'ONRC_EDITION',
    legalForm: 'SRL',
    codInmatriculare: 'J1992002621040',
    registrationDate: '1992-11-05',
    registrationDatePresent: true,
    headlineStatus: { code: '1048', label: 'funcțiune' },
    registry: dedemanEvidence(),
    territory: {
      sirutaCode: '20297',
      uatName: 'MUNICIPIUL BACĂU',
      countyName: 'JUDEŢUL BACĂU',
      matchConfidence: 'SAFE',
    },
    address: { county: 'Bacău' },
    fiscal: {
      vatPayer: true,
      declaredFiscallyInactive: false,
      mainCaenCode: '4752',
      asOf: '2026-05-18',
    },
    caenActivities: [
      { code: '4752', rev: 'rev3', label: 'Comerț', source: 'onrc' },
    ],
    publicMoney: null,
    asOf: { onrc: '2026-05-17', anaf: '2026-05-18' },
  },
  companyFinancials: {
    years: [
      { year: 2024, sourceSystem: 'anaf', turnover: '12294042595.00', netProfit: '1636814708.00', netLoss: '0.00', employees: '12313' },
      { year: 2022, sourceSystem: 'anaf', turnover: '11045879922.00', netProfit: '1702616369.00', netLoss: '0.00', employees: '12245' },
    ],
    trajectory: null,
  },
}

/** DEDEMAN with these statement years and, unless given, no fiscal record at all. */
const withYears = (
  years: RawCompanyFinancialYear[],
  company: Partial<NonNullable<CompanyProfileResponse['company']>> = {},
): CompanyProfileResponse => ({
  company: { ...dedemanResponse.company!, fiscal: null, asOf: { onrc: '2026-07-08', anaf: null }, ...company },
  companyFinancials: { years, trajectory: null },
})

const statement = (
  year: number,
  fields: Partial<RawCompanyFinancialYear> = {},
): RawCompanyFinancialYear => ({
  year,
  turnover: '1000.00',
  netProfit: null,
  netLoss: null,
  employees: '3',
  ...fields,
})

describe('mapCompanyProfile', () => {
  it('does not present derived or unknown sources as ONRC and preserves unknown fiscal revision', () => {
    const input: CompanyProfileResponse = {
      ...dedemanResponse,
      company: {
        ...dedemanResponse.company!,
        fiscal: { ...dedemanResponse.company!.fiscal!, mainCaenCode: '6210', mainCaenRev: null },
        caenActivities: [
          { code: '6210', rev: 'rev2', label: 'Air transport', source: 'derived' },
          { code: '6210', rev: 'rev2', label: 'Untrusted', source: 'new-source' },
          { code: '6210', rev: 'rev3', label: 'Software', source: 'onrc' },
          { code: '6210', rev: null, label: null, source: 'anaf' },
        ],
      },
    }
    const result = mapCompanyProfile(input)!
    expect(result.caenActivities.map((row) => row.source)).toEqual(['onrc', 'anaf'])
    expect(result.fiscal.fiscalCaen).toEqual({ code: '6210', rev: null })
    expect(() => privateCompanyProfileSchema.parse(result)).not.toThrow()
  })

  it('passes through an explicitly supplied fiscal revision', () => {
    const result = mapCompanyProfile({ ...dedemanResponse, company: {
      ...dedemanResponse.company!,
      fiscal: { ...dedemanResponse.company!.fiscal!, mainCaenRev: 'rev3' },
    } })!
    expect(result.fiscal.fiscalCaen?.rev).toBe('rev3')
  })

  it('maps DEDEMAN into a schema-valid PrivateCompanyProfile', () => {
    const profile = mapCompanyProfile(dedemanResponse)
    expect(profile).not.toBeNull()
    // Round-trips through the UI schema (the contract the components consume).
    expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
  })

  it('coerces string Money/BigInt scalars to numbers and renames year→fiscalYear', () => {
    const profile = mapCompanyProfile(dedemanResponse)!
    expect(profile.financials).toHaveLength(2)
    const latest = profile.financials[0]
    expect(latest.fiscalYear).toBe(2024)
    expect(latest.turnover).toBe(12294042595)
    expect(latest.netProfit).toBe(1636814708)
    expect(latest.employees).toBe(12313)
    expect(latest.currency).toBe('RON')
  })

  it('keeps a reported zero on either side of the profit/loss pair, as exact text (CD-11)', () => {
    const profile = mapCompanyProfile(
      withYears([
        statement(2024, { netProfit: '0.00', netLoss: '0.00' }),
        statement(2023, { netProfit: null, netLoss: null }),
        statement(2022, { netProfit: '0', netLoss: '500' }),
      ]),
    )!
    const [breakEven, unreported, loss] = profile.financials
    // 0/0 is a break-even year: a zero, not a missing value.
    expect([breakEven!.netProfit, breakEven!.netLoss]).toEqual([0, 0])
    expect([breakEven!.originals.net_profit, breakEven!.originals.net_loss]).toEqual(['0.00', '0.00'])
    // null/null stays nothing reported.
    expect([unreported!.netProfit, unreported!.netLoss]).toEqual([null, null])
    expect(unreported!.originals.net_profit).toBeNull()
    // The zero profit ANAF writes beside a loss never hides the loss.
    expect([loss!.originals.net_profit, loss!.originals.net_loss]).toEqual(['0', '500'])
    // DEDEMAN's profitable years keep their reported zero loss.
    expect(mapCompanyProfile(dedemanResponse)!.financials[0]!.netLoss).toBe(0)
  })

  it('maps uppercase SAFE match confidence to lowercase safe', () => {
    const profile = mapCompanyProfile(dedemanResponse)!
    expect(profile.geography?.matchConfidence).toBe('safe')
  })

  it('keeps each statement year’s publisher, unknown staying null (CD-12)', () => {
    const profile = mapCompanyProfile(
      withYears([
        statement(2024, { sourceSystem: 'anaf' }),
        statement(2011, { sourceSystem: 'MFP' }),
        statement(2010, { sourceSystem: 'another-source' }),
        // A recorded response from before the field existed.
        statement(2009),
      ]),
    )!
    expect(profile.financials.map((year) => year.sourceSystem)).toEqual(['anaf', 'mfp', null, null])
    expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
  })

  it('finds ANAF only on ANAF’s own evidence: an MFP-only history is not ANAF data (CD-12)', () => {
    const mfpOnly = mapCompanyProfile(withYears([statement(2011, { sourceSystem: 'mfp' })]))!
    expect(mfpOnly.fiscal.anafFound).toBe(false)
    // A statement of unknown publisher says nothing about ANAF either.
    expect(mapCompanyProfile(withYears([statement(2011)]))!.fiscal.anafFound).toBe(false)
    // An ANAF-published statement, or ANAF's fiscal record, is ANAF data.
    expect(mapCompanyProfile(withYears([statement(2021, { sourceSystem: 'anaf' })]))!.fiscal.anafFound).toBe(true)
    expect(mapCompanyProfile(withYears([], { asOf: { onrc: '2026-07-08', anaf: '2026-06-15' } }))!.fiscal.anafFound).toBe(true)
  })

  it('synthesizes onrc + anaf sources from asOf without fabricating URLs', () => {
    const profile = mapCompanyProfile(dedemanResponse)!
    expect(profile.sources).toEqual([
      { id: 'onrc', snapshotDate: '2026-05-17' },
      { id: 'anaf', snapshotDate: '2026-05-18' },
    ])
    expect(JSON.stringify(profile)).not.toMatch(/https?:/u)
  })

  it('never dates ANAF with the registry’s date (CD-13)', () => {
    const profile = mapCompanyProfile(withYears([], { asOf: { onrc: '2026-07-08', anaf: null } }))!
    expect(profile.fiscal.asOfDate).toBeNull()
    expect(profile.sources).toEqual([{ id: 'onrc', snapshotDate: '2026-07-08' }])
    expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
  })

  it('returns null when company is null (unknown CUI → 404)', () => {
    const parsed = companyProfileResponseSchema.parse({
      company: null,
      companyFinancials: null,
    })
    expect(mapCompanyProfile(parsed)).toBeNull()
  })

  it('derives anafFound=false when no ANAF signal at all', () => {
    const noAnaf: CompanyProfileResponse = {
      company: {
        ...dedemanResponse.company!,
        fiscal: null,
        asOf: { onrc: '2026-05-17', anaf: null },
      },
      companyFinancials: { years: [], trajectory: null },
    }
    expect(mapCompanyProfile(noAnaf)!.fiscal.anafFound).toBe(false)
  })
})

describe('mapCompanyProfile — the pinned ONRC edition (API19)', () => {
  const withEvidence = (registry: RawRegistryEvidence, company: Partial<NonNullable<CompanyProfileResponse['company']>> = {}) =>
    companyProfileResponseSchema.parse({ ...dedemanResponse, company: { ...dedemanResponse.company!, registry, ...company } })

  it('keeps an „în funcțiune" observation beside a conflicting one on the same identifier, choosing neither', () => {
    const conflict = dedemanEvidence({
      profile: { ...dedemanEvidence().profile!, statusCode: { value: null, basis: 'MULTIPLE_VALUES' } },
      identifiers: [{ ...dedemanEvidence().identifiers[0]!, statusCodes: ['1048', '1070'] }],
    })
    const profile = mapCompanyProfile(withEvidence(conflict, { headlineStatus: null }))!
    expect(profile.status).toBeNull()
    expect(profile.registry.profile?.statusCode).toEqual({ value: null, basis: 'multiple_values' })
    expect(profile.registry.identifiers[0]).toMatchObject({ statusCodes: ['1048', '1070'], hasActiveObservation: true })
    expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
  })

  it('reads no older scalar as current for a CUI outside the edition', () => {
    // A response still carrying registry scalars beside NOT_IN_EDITION: none of them is believed.
    const outside = { ...dedemanEvidence(), cuiState: 'NOT_IN_EDITION', profile: null, identifiers: [] }
    const profile = mapCompanyProfile(
      withEvidence(outside, { caenActivities: [...dedemanResponse.company!.caenActivities, { code: '4752', rev: null, label: null, source: 'anaf' }] }),
    )!
    expect(profile.registry.cuiState).toBe('not_in_edition')
    expect(profile).toMatchObject({ legalForm: null, registrationDate: null, status: null, geography: null, codInmatriculare: null, nameSource: 'core_organization' })
    // ANAF's declared activity is its own source and stays; the edition's rows do not.
    expect(profile.caenActivities.map((row) => row.source)).toEqual(['anaf'])
    // Fiscal and financial content stay attributed and usable.
    expect(profile.fiscal.vatPayer).toBe(true)
    expect(profile.financials).toHaveLength(2)
  })

  it('treats an unpublished registry as a state: no profile, no ONRC date, never in the edition', () => {
    const profile = mapCompanyProfile(withEvidence({ ...dedemanEvidence(), registry: UNPUBLISHED, cuiState: 'IN_EDITION' }))!
    expect(profile.registry.registry.state).toBe('unpublished')
    expect(profile.registry.cuiState).toBe('unpublished')
    expect(profile.registry.profile).toBeNull()
    expect(profile.registry.identifiers).toEqual([])
    expect(profile.sources.map((source) => source.id)).toEqual(['anaf'])
  })

  it('fails closed on what it does not know: a state, a basis, a published scope without an edition', () => {
    expect(mapRegistryEnvelope({ ...PUBLISHED, state: 'PAUSED' }).state).toBe('unavailable')
    expect(mapRegistryEnvelope({ ...PUBLISHED, editionId: null }).state).toBe('unavailable')
    expect(mapRegistryEnvelope({ ...PUBLISHED, source: 'other' }).state).toBe('unavailable')
    const strange = dedemanEvidence({ profile: { ...dedemanEvidence().profile!, legalForm: { value: 'SRL', basis: 'GUESSED' } } })
    expect(mapCompanyProfile(withEvidence(strange))!.registry.profile?.legalForm).toEqual({ value: null, basis: 'unresolved' })
  })

  it('keeps the recorded date as ONRC’s civil date text, never shifted by a time zone', () => {
    const profile = mapCompanyProfile(dedemanResponse)!
    expect(profile.registrationDate).toBe('1992-11-05')
    expect(profile.registry.profile?.recordedDate).toEqual({ value: '1992-11-05', basis: 'single_observation' })
    expect(profile.status).toEqual({ code: '1048', label: 'funcțiune' })
  })
})

describe('mapCompanyProfile — public money and trajectory', () => {
  const withMoney = (publicMoney: NonNullable<
    CompanyProfileResponse['company']
  >['publicMoney']): CompanyProfileResponse => ({
    ...dedemanResponse,
    company: { ...dedemanResponse.company!, publicMoney },
  })

  it('never fabricates a zero for a per-flow total it cannot read', () => {
    const profile = mapCompanyProfile(
      withMoney({
        totalRon: '100.00',
        flowCount: 5,
        // An empty string coerces to 0 in JS — the exact trap a `?? 0` hides.
        byFlowType: [{ flowType: 'pnrr_subcontract', totalRon: '', count: 5 }],
        byYear: [],
      }),
    )
    expect(profile!.publicMoney!.byFlowType[0]!.totalRon).toBeNull()
  })

  it('keeps the per-flow rows when only the header total is unreadable', () => {
    // byFlowType comes from an independent aggregation; a bad header says
    // nothing about it, and dropping the rows is an undetectable false negative.
    const profile = mapCompanyProfile(
      withMoney({
        totalRon: 'n/a',
        flowCount: 3,
        byFlowType: [
          { flowType: 'procurement_contract', totalRon: '8766606.32', count: 172 },
        ],
        byYear: [],
      }),
    )
    expect(profile!.publicMoney).not.toBeNull()
    expect(profile!.publicMoney!.totalRon).toBeNull()
    expect(profile!.publicMoney!.byFlowType).toHaveLength(1)
  })

  it('stays null when the company appears in no flow at all', () => {
    expect(mapCompanyProfile(withMoney(null))!.publicMoney).toBeNull()
  })

  it('passes the server trajectory through without re-deriving the net result', () => {
    const profile = mapCompanyProfile({
      ...dedemanResponse,
      companyFinancials: {
        years: [],
        trajectory: {
          fromYear: 2024,
          toYear: 2025,
          turnoverDelta: '863792940.00',
          netResultDelta: '-1477503.00',
          employeesDelta: '389',
        },
      },
    })
    expect(profile!.financialTrajectory).toEqual({
      fromYear: 2024,
      toYear: 2025,
      turnoverDelta: 863_792_940,
      netResultDelta: -1_477_503,
      employeesDelta: 389,
      // An API without the reasons yet: none, never invented.
      turnoverDeltaReason: null,
      netResultDeltaReason: null,
      employeesDeltaReason: null,
    })
  })

  it('carries why a server delta is null', () => {
    const profile = mapCompanyProfile({
      ...dedemanResponse,
      companyFinancials: {
        years: [],
        trajectory: {
          fromYear: 2024,
          toYear: 2025,
          turnoverDelta: null,
          netResultDelta: '10.00',
          employeesDelta: null,
          turnoverDeltaReason: 'latest_not_reported',
          netResultDeltaReason: null,
          employeesDeltaReason: 'policy_incompatible',
        },
      },
    })
    expect(profile!.financialTrajectory).toMatchObject({
      employeesDeltaReason: 'policy_incompatible',
      netResultDelta: 10,
      turnoverDelta: null,
      turnoverDeltaReason: 'latest_not_reported',
    })
  })

  it('maps the balance-sheet summary, keeping an absent metric null not zero', () => {
    const profile = mapCompanyProfile({
      ...dedemanResponse,
      companyFinancials: {
        years: [
          {
            year: 2025,
            sourceSystem: 'anaf',
            turnover: '1',
            netProfit: '1',
            netLoss: '0.00',
            employees: '1',
            summary: { totalEquity: '5110382928', debts: null },
          },
        ],
        trajectory: null,
      },
    })
    const summary = profile!.financials[0]!.summary!
    expect(summary.totalEquity).toBe(5_110_382_928)
    expect(summary.debts).toBeNull()
    // A metric the server never sent is absent, not zero.
    expect(summary.inventories).toBeNull()
  })
})

describe('mapCompanyProfile — statement qualification (CD-14)', () => {
  /** A qualification as the API sends it: every metric REPORTED unless overridden. */
  const rawQualification = (
    statuses: Partial<Record<(typeof FINANCIAL_METRICS)[number], string>> = {},
    netResult: string | null = null,
    extra: Partial<RawStatementQualification> = {},
  ): RawStatementQualification => ({
    assessment: 'ASSESSED',
    reason: null,
    releaseId: '2',
    policyVersion: 'companies-analytics-admission-2026-10-02-q1',
    policySha256: 'a1'.repeat(32),
    policyApprovedOn: '2026-10-02',
    evaluatorVersion: 'sql-v1',
    metrics: FINANCIAL_METRICS.map((metric) => ({ metric, status: statuses[metric] ?? 'REPORTED' })),
    netResultStatus: statuses.net_result ?? 'REPORTED',
    netResult,
    holdReason: null,
    ...extra,
  })
  const one = (year: RawCompanyFinancialYear) => mapCompanyProfile(withYears([year]))!.financials[0]!

  it('serves the 300-trillion held observation as its exact text, held, never as a figure', () => {
    const held = one(
      statement(2020, {
        netProfit: '291000000000000',
        qualification: rawQualification(
          { net_profit: 'HELD_OBSERVATION', net_result: 'HELD_COMPONENT', total_revenue: 'HELD_OBSERVATION', turnover: 'HELD_OBSERVATION' },
          null,
          { holdReason: 'reviewed: turnover keyed 1,000,000x' },
        ),
        summary: { totalRevenue: '300000000000000' },
        turnover: '300000000000000',
      }),
    )
    expect(held.originals.turnover).toBe('300000000000000')
    expect(held.originals.total_revenue).toBe('300000000000000')
    expect(held.qualification).toMatchObject({ assessment: 'assessed', holdReason: 'reviewed: turnover keyed 1,000,000x' })
    expect(held.qualification.statuses?.turnover).toBe('held_observation')
    expect(reportedNumber(held, 'turnover')).toBeNull()
    expect(qualifiedNet(held)).toBeNull()
    // Unrelated reported values of the same statement stay usable.
    expect(reportedNumber(held, 'employees')).toBe(3)
  })

  it('never takes a JSON number for an exact original or an exact net', () => {
    // 2^53 + 1 cannot survive a double: the number already reads 2^53.
    const rounded = Number.MAX_SAFE_INTEGER + 2
    const year = one(statement(2024, { qualification: rawQualification({}, null, { netResult: rounded }), turnover: rounded }))
    expect(year.originals.turnover).toBeNull()
    expect(reportedNumber(year, 'turnover')).toBeNull()
    // A reported net without exact text is malformed: never reported.
    expect(year.qualification).toMatchObject({ assessment: 'not_assessed', reason: 'qualification_malformed' })
    expect(qualifiedNet(year)).toBeNull()
  })

  it('a reported 0/0 is a zero net; the net is the evaluator’s, never a local subtraction', () => {
    const breakEven = one(statement(2024, { netLoss: '0.00', netProfit: '0.00', qualification: rawQualification({}, '0.00') }))
    expect(qualifiedNet(breakEven)).toBe(0)
    const missing = one(statement(2023, { qualification: rawQualification({ net_loss: 'MISSING', net_profit: 'MISSING', net_result: 'MISSING' }) }))
    expect(qualifiedNet(missing)).toBeNull()
    // A 464d-like statement: the profit is reported, the net is held: no „profit − 0".
    const fourSixFour = one(
      statement(2024, { netProfit: '120.00', qualification: rawQualification({ net_loss: 'MISSING', net_result: 'HELD_PROFILE' }) }),
    )
    expect(reportedNumber(fourSixFour, 'net_profit')).toBe(120)
    expect(qualifiedNet(fourSixFour)).toBeNull()
  })

  it('never reads an absent, not-assessed or malformed qualification as reported', () => {
    const absent = one(statement(2024))
    expect(absent.qualification).toMatchObject({ assessment: 'not_assessed', reason: 'qualification_missing' })
    expect(reportedNumber(absent, 'turnover')).toBeNull()
    const unavailable = one(
      statement(2024, { qualification: { ...rawQualification(), assessment: 'NOT_ASSESSED', metrics: [], netResultStatus: null, reason: 'qualification_unavailable' } }),
    )
    expect(unavailable.qualification).toMatchObject({ assessment: 'not_assessed', reason: 'qualification_unavailable', statuses: null })
    for (const malformed of [
      rawQualification({}, null, { evaluatorVersion: 'sql-v2' }),
      rawQualification({}, null, { metrics: rawQualification().metrics.slice(1) }),
      rawQualification({ debts: 'ADMITTED' }),
      rawQualification({}, null, { netResultStatus: 'MISSING' }),
      rawQualification({}, null),
      rawQualification({ net_result: 'HELD_PROFILE' }, '5.00'),
      rawQualification({}, 'NaN'),
    ]) {
      const year = one(statement(2024, { netProfit: '5.00', qualification: malformed }))
      expect(year.qualification).toMatchObject({ assessment: 'not_assessed', reason: 'qualification_malformed', statuses: null })
      expect(reportedNumber(year, 'turnover')).toBeNull()
    }
  })

  it('links the statement’s own published source, never a guessed one', () => {
    const mfp = one(
      statement(2014, {
        source: { url: 'https://data.gov.ro/x.txt', urlKind: 'mfp_resource' },
        sourceSystem: 'mfp',
      }),
    )
    expect(mfp.sourceSystem).toBe('mfp')
    expect(mfp.source).toMatchObject({ url: 'https://data.gov.ro/x.txt', urlKind: 'mfp_resource' })
    const unknownKind = one(
      statement(2014, { source: { url: 'https://example.org', urlKind: 'other' } }),
    )
    expect(unknownKind.source).toMatchObject({ url: null, urlKind: null })
  })

  it('carries a split statement’s contributing files, https links only, and null when not read (CQA-14)', () => {
    const lines = [
      { rowNumber: '76930', url: 'https://data.gov.ro/a.txt', indicators: [{ code: 'I1', name: 'X' }] },
      { rowNumber: null, url: 'http://data.gov.ro/b.txt', indicators: [{ code: 'I3', name: null }] },
    ]
    const split = one(
      statement(2009, {
        source: { url: 'https://data.gov.ro/a.txt', urlKind: 'mfp_resource', contributingSources: lines },
        sourceSystem: 'mfp',
      }),
    )
    expect(split.source).toMatchObject({
      contributingSources: [
        { rowNumber: '76930', url: 'https://data.gov.ro/a.txt', indicators: [{ code: 'I1', name: 'X' }] },
        { rowNumber: null, url: null, indicators: [{ code: 'I3', name: null }] },
      ],
    })
    const unread = one(statement(2014, { source: { url: null, urlKind: null } }))
    expect(unread.source).toMatchObject({ contributingSources: null })
    expect(() => privateCompanyProfileSchema.parse(mapCompanyProfile(withYears([statement(2009, { source: split.source as never })])))).not.toThrow()
  })

  it('round-trips through the UI schema', () => {
    const profile = mapCompanyProfile(withYears([statement(2024, { qualification: rawQualification({}, '1.00'), netProfit: '1.00' })]))
    expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
  })
})

describe('mapCompanyProfile — long-format-only statements (B5c)', () => {
  const OMV_2013 = {
    year: 2013,
    sourceSystem: 'MFP',
    filerClass: 'ir',
    sourceSnapshotId: 'mfp:situatii_financiare_2021:2013:13dec119-4013-4689-90e0-52da4c69d3ea',
    resourceUrl: 'https://data.gov.ro/dataset/f8353c0e-fee9-4aa3-b26d-be0e96c328a7/resource/13dec119-4013-4689-90e0-52da4c69d3ea/download/web_ir_an2013.txt',
  }
  const withLongForm = (longFormOnly: unknown, years: RawCompanyFinancialYear[] = dedemanResponse.companyFinancials!.years): CompanyProfileResponse =>
    companyProfileResponseSchema.parse({ ...dedemanResponse, companyFinancials: { years, trajectory: null, longFormOnly } })

  it('maps year, publisher, the class verbatim, the exact anchor capture and the recorded file — no value and no row', () => {
    const profile = mapCompanyProfile(withLongForm([{ ...OMV_2013, statementLocator: 'mfp:13dec119:19' }]))!
    expect(profile.longFormStatements).toEqual([
      { fiscalYear: 2013, publisher: 'mfp', filerClass: 'ir', sourceSnapshotId: OMV_2013.sourceSnapshotId, resourceUrl: OMV_2013.resourceUrl },
    ])
    // The typed history is untouched beside it.
    expect(profile.financials.map((year) => year.fiscalYear)).toEqual([2024, 2022])
    expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
  })

  it('keeps unknown apart from none: absent or null stays null, an empty list stays empty', () => {
    expect(mapCompanyProfile(dedemanResponse)!.longFormStatements).toBeNull()
    expect(mapCompanyProfile(withLongForm(null))!.longFormStatements).toBeNull()
    expect(mapCompanyProfile(withLongForm([]))!.longFormStatements).toEqual([])
    expect(mapCompanyProfile({ ...dedemanResponse, companyFinancials: null })!.longFormStatements).toBeNull()
  })

  it('serves a long-format-only CUI with no typed year, nothing assumed about its publisher or link', () => {
    const profile = mapCompanyProfile(
      withLongForm([{ ...OMV_2013, sourceSystem: 'other' }, { ...OMV_2013, year: 2012, filerClass: null, resourceUrl: 'javascript:alert(1)' }], []),
    )!
    expect(profile.financials).toEqual([])
    expect(profile.longFormStatements?.map(({ fiscalYear, publisher, filerClass, resourceUrl }) => [fiscalYear, publisher, filerClass, resourceUrl])).toEqual([
      [2013, null, 'ir', OMV_2013.resourceUrl],
      [2012, 'mfp', null, null],
    ])
  })
})

// server-companies' contract, 26 November 2026: newest first, exact strings, null = no figure read, null list = forms unknown.
describe('mapCompanyProfile — IFRS-form years and each year’s form (PRIV-ZVPV)', () => {
  const withIfrs = (ifrsFormYears: unknown, years: RawCompanyFinancialYear[] = dedemanResponse.companyFinancials!.years): CompanyProfileResponse =>
    companyProfileResponseSchema.parse({ ...dedemanResponse, companyFinancials: { years, trajectory: null, longFormOnly: [], ifrsFormYears } })
  const file = (year: number, fields: Record<string, unknown> = {}) => ({
    year,
    sourceSystem: 'mfp',
    turnover: '14764836448',
    netResult: '2399947986',
    employees: '13322',
    sourceUrl: `https://data.gov.ro/web_ir_an${year}.txt`,
    ...fields,
  })

  it('maps the file years oldest first, their figures as the exact strings served, a loss negative, a blank null', () => {
    const profile = mapCompanyProfile(withIfrs([file(2016, { turnover: null, netResult: '-630646624' }), file(2015, { employees: '0' })]))!
    expect(profile.ifrsFormYears).toEqual([
      { fiscalYear: 2015, publisher: 'mfp', turnover: '14764836448', netResult: '2399947986', employees: '0', sourceUrl: 'https://data.gov.ro/web_ir_an2015.txt' },
      { fiscalYear: 2016, publisher: 'mfp', turnover: null, netResult: '-630646624', employees: '13322', sourceUrl: 'https://data.gov.ro/web_ir_an2016.txt' },
    ])
    expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
  })

  it('keeps unknown apart from none, links only a web address, and assumes no publisher', () => {
    expect(mapCompanyProfile(dedemanResponse)!.ifrsFormYears).toBeNull()
    expect(mapCompanyProfile(withIfrs(null))!.ifrsFormYears).toBeNull()
    expect(mapCompanyProfile(withIfrs([]))!.ifrsFormYears).toEqual([])
    const [odd] = mapCompanyProfile(withIfrs([file(2014, { sourceSystem: 'other', sourceUrl: 'javascript:alert(1)' })]))!.ifrsFormYears!
    expect(odd).toMatchObject({ publisher: null, sourceUrl: null })
  })

  it('reads a year’s form as IFRS or unmarked, never another form', () => {
    const [newest, older] = dedemanResponse.companyFinancials!.years
    const profile = mapCompanyProfile(withIfrs([], [{ ...newest!, reportingForm: 'IFRS' }, { ...older!, reportingForm: 'ORDINARY' }]))!
    expect(profile.financials.map((year) => [year.fiscalYear, year.reportingForm])).toEqual([
      [2024, 'ifrs'],
      [2022, null],
    ])
    expect(mapCompanyProfile(dedemanResponse)!.financials.every((year) => year.reportingForm === null)).toBe(true)
  })
})

describe('public money and DA supplier names (root ruling 2026-11-22 under 22a47bb2)', () => {
  it('a company with incoming direct purchases marks the render; one without does not', async () => {
    const { installDaSupplierNameSink } = await import('@/lib/da-supplier-name-mark')
    const marks = vi.fn()
    installDaSupplierNameSink(marks)
    try {
      const money = (flowType: string) => ({ totalRon: '100', flowCount: 1, byFlowType: [{ flowType, totalRon: '100', count: 1 }], byYear: [] })
      mapCompanyProfile({ ...dedemanResponse, company: { ...dedemanResponse.company!, publicMoney: money('procurement_contract') } } as never)
      expect(marks).not.toHaveBeenCalled()
      mapCompanyProfile({ ...dedemanResponse, company: { ...dedemanResponse.company!, publicMoney: money('direct_acquisition') } } as never)
      expect(marks).toHaveBeenCalled()
    } finally {
      installDaSupplierNameSink(null)
    }
  })
})
