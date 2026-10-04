import { describe, expect, it } from 'vitest'
import { FINANCIAL_METRICS, privateCompanyProfileSchema } from '@/schemas/private-company'
import { qualifiedNet, reportedNumber } from '../../lib/financial-qualification'
import {
  companiesSearchResponseSchema,
  companyProfileResponseSchema,
  type CompanyProfileResponse,
  type RawCompanyFinancialYear,
  type RawStatementQualification,
} from './company-queries'
import { mapCompanyListItem, mapCompanyProfile } from './company-mappers'
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

const provenance = (resourceKey: string, row: number, sourceUrl: string | null = null) => ({
  resourceKey,
  sourceRowNumber: row,
  sourceRowSha256: `${resourceKey}-${String(row)}`.padEnd(64, '0'),
  sourceUrl,
  sourceFileSha256: null,
  sourcePublishedAt: '2026-09-30',
})

/** DEDEMAN's evidence as the API serializes it: one identifier, one status, one CAEN row. */
const dedemanEvidence = (fields: Partial<RawRegistryEvidence> = {}): RawRegistryEvidence => ({
  registry: PUBLISHED,
  cuiState: 'IN_EDITION',
  profile: {
    identityObservations: 1,
    identifierCount: 1,
    unresolvedIdentifierCount: 0,
    unidentifiedObservations: 0,
    name: { value: 'DEDEMAN SRL', basis: 'SINGLE_OBSERVATION' },
    legalForm: { value: 'SRL', basis: 'SINGLE_OBSERVATION' },
    recordedDate: { value: '1992-11-05', basis: 'SINGLE_OBSERVATION' },
    countyCode: { value: 'BC', basis: 'SINGLE_OBSERVATION' },
    countyName: 'Bacău',
    uatSirutaCode: { value: '20297', basis: 'SINGLE_OBSERVATION' },
    uatName: 'Municipiul Bacău',
    statusCode: { value: '1048', basis: 'SINGLE_OBSERVATION' },
    caenCoverage: 'COMPLETE',
    statusCoverage: 'COMPLETE',
  },
  identifiers: [
    {
      id: '7:J1992002621040',
      identifierKey: 'J1992002621040',
      identityRowCount: 1,
      statusCodes: ['1048'],
      hasActiveObservation: true,
      countyCodes: ['BC'],
      countyBasis: 'single_observation',
      caenObservations: 1,
      unknownRevisionCaenObservations: 0,
    },
  ],
  identityObservations: [
    {
      id: '7:OD_FIRME:12',
      identifierKey: 'J1992002621040',
      name: 'DEDEMAN SRL',
      legalForm: 'SRL',
      recordedDate: '1992-11-05',
      recordedDateState: 'date',
      countyCode: 'BC',
      provenance: provenance('OD_FIRME', 12),
    },
  ],
  caenObservations: [
    {
      id: '7:OD_CAEN_AUTORIZAT:40',
      identifierKey: 'J1992002621040',
      parseState: 'code',
      code: '4752',
      revisionState: 'known',
      revision: 'rev3',
      catalogLabel: { label: 'Comerț', system: 'caen_rev3', source: 'current_db_catalog' },
      provenance: provenance('OD_CAEN_AUTORIZAT', 40),
    },
  ],
  statusObservations: [
    { id: '7:OD_STARE_FIRMA:9', identifierKey: 'J1992002621040', parseState: 'code', code: '1048', label: null, provenance: provenance('OD_STARE_FIRMA', 9) },
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
    headlineStatus: { code: '1048', label: 'funcțiune', labelSource: 'API_NOMENCLATURE' },
    registry: dedemanEvidence(),
    territory: {
      sirutaCode: '20297',
      uatName: 'MUNICIPIUL BACĂU',
      countyName: 'JUDEŢUL BACĂU',
      matchConfidence: 'SAFE',
    },
    address: { display: '', county: 'Bacău', locality: 'Municipiul Bacău' },
    fiscal: {
      vatPayer: true,
      declaredFiscallyInactive: false,
      mainCaenCode: '4752',
      registeredName: 'DEDEMAN SRL',
      asOf: '2026-05-18',
    },
    caenActivities: [
      { code: '4752', rev: 'rev3', label: 'Comerț', source: 'onrc', labelSource: 'current_db_catalog' },
    ],
    representatives: [],
    euBranches: [],
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
      statusObservations: [
        dedemanEvidence().statusObservations[0]!,
        { id: '7:OD_STARE_FIRMA:10', identifierKey: 'J1992002621040', parseState: 'code', code: '1070', label: null, provenance: provenance('OD_STARE_FIRMA', 10) },
      ],
    })
    const profile = mapCompanyProfile(withEvidence(conflict, { headlineStatus: null }))!
    expect(profile.status).toBeNull()
    expect(profile.registry.profile?.statusCode).toEqual({ value: null, basis: 'multiple_values' })
    expect(profile.registry.identifiers[0]).toMatchObject({ statusCodes: ['1048', '1070'], hasActiveObservation: true })
    expect(profile.registry.statusObservations.map((row) => row.id)).toEqual(['7:OD_STARE_FIRMA:9', '7:OD_STARE_FIRMA:10'])
    expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
  })

  it('reads no older scalar as current for a CUI outside the edition', () => {
    // A response still carrying registry scalars beside NOT_IN_EDITION: none of them is believed.
    const outside = { ...dedemanEvidence(), cuiState: 'NOT_IN_EDITION', profile: null, identifiers: [], identityObservations: [], caenObservations: [], statusObservations: [] }
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
    expect(profile.registry.statusObservations).toEqual([])
    expect(profile.sources.map((source) => source.id)).toEqual(['anaf'])
  })

  it('fails closed on what it does not know: a state, a basis, a published scope without an edition', () => {
    expect(mapRegistryEnvelope({ ...PUBLISHED, state: 'PAUSED' }).state).toBe('unavailable')
    expect(mapRegistryEnvelope({ ...PUBLISHED, editionId: null }).state).toBe('unavailable')
    expect(mapRegistryEnvelope({ ...PUBLISHED, source: 'other' }).state).toBe('unavailable')
    const strange = dedemanEvidence({ profile: { ...dedemanEvidence().profile!, legalForm: { value: 'SRL', basis: 'GUESSED' } } })
    expect(mapCompanyProfile(withEvidence(strange))!.registry.profile?.legalForm).toEqual({ value: null, basis: 'unresolved' })
  })

  it('names a CAEN row only from the current catalog of its OWN known revision, Rev.0 included', () => {
    const rows = [
      { ...dedemanEvidence().caenObservations[0]!, id: 'a', revision: 'rev0', code: '1111', catalogLabel: { label: 'Rev.0 class', system: 'caen_rev0', source: 'current_db_catalog' } },
      { ...dedemanEvidence().caenObservations[0]!, id: 'b', revision: null, revisionState: 'missing', catalogLabel: { label: 'Borrowed', system: 'caen_rev2', source: 'current_db_catalog' } },
      { ...dedemanEvidence().caenObservations[0]!, id: 'c', revision: 'rev2', catalogLabel: { label: 'Other revision', system: 'caen_rev3', source: 'current_db_catalog' } },
      { ...dedemanEvidence().caenObservations[0]!, id: 'd', revision: 'rev9', catalogLabel: { label: 'Unknown', system: 'caen_rev9', source: 'current_db_catalog' } },
    ]
    const caen = mapCompanyProfile(withEvidence(dedemanEvidence({ caenObservations: rows })))!.registry.caenObservations
    expect(caen.map((row) => [row.id, row.revision, row.catalogLabel])).toEqual([
      ['a', 'rev0', 'Rev.0 class'],
      ['b', null, null],
      ['c', 'rev2', null],
      ['d', null, null],
    ])
  })

  it('links a source row only to an https resource of the edition; anything else is no link', () => {
    const rows = [
      { ...dedemanEvidence().identityObservations[0]!, id: 'https', provenance: provenance('OD_FIRME', 1, 'https://data.gov.ro/dataset/firme.csv') },
      { ...dedemanEvidence().identityObservations[0]!, id: 'http', provenance: provenance('OD_FIRME', 2, 'http://data.gov.ro/firme.csv') },
      { ...dedemanEvidence().identityObservations[0]!, id: 'script', provenance: provenance('OD_FIRME', 3, 'javascript:alert(1)') },
      { ...dedemanEvidence().identityObservations[0]!, id: 'object', provenance: provenance('OD_FIRME', 4, 's3://bucket/raw.csv') },
    ]
    const identity = mapCompanyProfile(withEvidence(dedemanEvidence({ identityObservations: rows })))!.registry.identityObservations
    expect(identity.map((row) => row.provenance.sourceUrl)).toEqual(['https://data.gov.ro/dataset/firme.csv', null, null, null])
  })

  it('keeps the recorded date as ONRC’s civil date text, never shifted by a time zone', () => {
    const profile = mapCompanyProfile(dedemanResponse)!
    expect(profile.registrationDate).toBe('1992-11-05')
    expect(profile.registry.profile?.recordedDate).toEqual({ value: '1992-11-05', basis: 'single_observation' })
    expect(profile.status).toEqual({ code: '1048', label: 'funcțiune', labelSource: 'api_nomenclature' })
  })
})

describe('mapCompanyListItem', () => {
  const node = {
    cui: '2816464',
    orgId: '1517396',
    name: 'DEDEMAN SRL',
    nameSource: 'ONRC_EDITION',
    legalForm: 'SRL',
    headlineStatus: { code: '1048', label: 'funcțiune', labelSource: 'API_NOMENCLATURE' },
    county: 'Bacău',
    vatPayer: true,
    declaredFiscallyInactive: false,
    registrationDate: '1992-11-05',
    registrationDatePresent: false,
    registryCuiState: 'IN_EDITION',
    hasActiveObservation: true,
    statusBasis: 'SINGLE_OBSERVATION',
    countyBasis: 'SINGLE_OBSERVATION',
    recordedDateBasis: 'MISSING',
  }

  it('maps a list node and nulls registrationDate when not present', () => {
    const item = mapCompanyListItem(node, mapRegistryEnvelope(PUBLISHED))
    expect(item).toMatchObject({ name: 'DEDEMAN SRL', county: 'Bacău', status: { code: '1048', label: 'funcțiune' }, registrationDate: null })
    expect(item).toMatchObject({ registryCuiState: 'in_edition', hasActiveObservation: true, statusBasis: 'single_observation', recordedDateBasis: 'missing' })
  })

  it('keeps a conflict on the row: no status, its basis, the active observation', () => {
    const item = mapCompanyListItem({ ...node, headlineStatus: null, statusBasis: 'MULTIPLE_VALUES' }, mapRegistryEnvelope(PUBLISHED))
    expect(item).toMatchObject({ status: null, statusBasis: 'multiple_values', hasActiveObservation: true })
  })

  it('carries no registry field on a page whose registry cannot answer', () => {
    const item = mapCompanyListItem(node, mapRegistryEnvelope(UNPUBLISHED))
    expect(item).toMatchObject({ registryCuiState: 'unpublished', status: null, county: null, legalForm: null, hasActiveObservation: null, statusBasis: null, nameSource: 'core_organization' })
    // ANAF's own answers stay.
    expect(item).toMatchObject({ vatPayer: true, declaredFiscallyInactive: false })
  })

  it('parses a serialized page with its envelope', () => {
    const page = companiesSearchResponseSchema.parse({
      companies: { edges: [{ cursor: 'c1', node }], pageInfo: { hasNextPage: true, endCursor: 'c1' }, totalCount: 1, totalEstimated: false, registry: PUBLISHED },
    })
    expect(mapRegistryEnvelope(page.companies.registry).scopeKey).toBe('onrc:published:7:3:11')
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
    holdDrift: [],
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
        source: { metricRuleVersion: 'r', sourceSystem: 'mfp', statementProfileHash: null, url: 'https://data.gov.ro/x.txt', urlKind: 'mfp_resource' },
        sourceSystem: 'mfp',
      }),
    )
    expect(mfp.sourceSystem).toBe('mfp')
    expect(mfp.source).toMatchObject({ url: 'https://data.gov.ro/x.txt', urlKind: 'mfp_resource' })
    const unknownKind = one(
      statement(2014, { source: { metricRuleVersion: 'r', sourceSystem: 'mfp', statementProfileHash: null, url: 'https://example.org', urlKind: 'other' } }),
    )
    expect(unknownKind.source).toMatchObject({ url: null, urlKind: null })
  })

  it('round-trips through the UI schema', () => {
    const profile = mapCompanyProfile(withYears([statement(2024, { qualification: rawQualification({}, '1.00'), netProfit: '1.00' })]))
    expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
  })
})
