import { describe, expect, it, vi } from 'vitest'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'
import { privateCompanyProfileSchema } from '@/schemas/private-company'
import { fetchPrivateCompanyProfileLive } from '../private-company-api.live'
import { mapActivitySelection, mapCompanyProfile } from './company-mappers'
import { companyProfileResponseSchema, type RawActivitySelection } from './company-queries'
import { mapRegistryEnvelope, mapRegistryEvidence, rawRegistryEvidenceSchema, type RawRegistryEnvelope } from './company-registry-graphql'

/**
 * The derived activity selection and the CAEN class state, from the wire:
 * an older API's answer (no `activitySelection`, no `classState`) reads
 * exactly as before; a v3 answer is kept only for the pinned edition and only
 * when it holds together — never an ANAF revision, never a catalog label on
 * a row that is no class.
 */

const transport = vi.hoisted(() => ({ calls: [] as string[], answer: (_document: string): Promise<unknown> => Promise.reject(new Error('unset')) }))

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>()
  return {
    ...actual,
    graphqlQuery: (document: string) => {
      transport.calls.push(document)
      return transport.answer(document)
    },
  }
})

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

const provenance = (row: number) => ({
  resourceKey: 'OD_CAEN_AUTORIZAT',
  sourceRowNumber: row,
  sourceRowSha256: String(row).padEnd(64, '0'),
  sourceUrl: null,
  sourceFileSha256: null,
  sourcePublishedAt: '2026-09-30',
})

const caenRow = (row: number, code: string, revision: string | null, classState?: string) => ({
  id: `7:OD_CAEN_AUTORIZAT:${String(row)}`,
  identifierKey: 'J1992002621040',
  parseState: 'code',
  code,
  revisionState: revision ? 'known' : 'missing',
  revision,
  catalogLabel: revision ? { label: `Eticheta ${code}`, system: `caen_${revision}`, source: 'current_db_catalog' } : null,
  ...(classState === undefined ? {} : { classState }),
  provenance: provenance(row),
})

/** The raw company as the API serializes it; `extra` adds the v3 fields. */
function rawResponse(extra: Record<string, unknown> = {}, rows: readonly ReturnType<typeof caenRow>[] = [caenRow(1, '4752', 'rev3')]) {
  return {
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
      registry: {
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
        identifiers: [],
        identityObservations: [],
        caenObservations: rows,
        statusObservations: [],
        observationsTruncated: false,
      },
      territory: null,
      address: { display: '', county: 'Bacău', locality: null },
      fiscal: { vatPayer: true, declaredFiscallyInactive: false, mainCaenCode: '4752', registeredName: 'DEDEMAN SRL', asOf: '2026-05-18' },
      caenActivities: [
        { code: '4752', rev: 'rev3', label: 'Comerț', source: 'onrc', labelSource: 'current_db_catalog' },
        { code: '4752', rev: null, label: null, source: 'anaf', labelSource: null },
      ],
      representatives: [],
      euBranches: [],
      publicMoney: null,
      asOf: { onrc: '2026-09-30', anaf: '2026-05-18' },
      ...extra,
    },
    companyFinancials: { years: [], trajectory: null },
  }
}

function selection(fields: Partial<RawActivitySelection> = {}): RawActivitySelection {
  return {
    basis: 'ONRC_SINGLE_CLASS',
    source: 'ONRC',
    code: '4752',
    revision: 'rev3',
    label: 'Comerț cu amănuntul al articolelor de fierărie',
    descriptionStatus: 'EXACT',
    descriptions: [],
    derived: true,
    classKeyCount: 1,
    unqualifiedObservationCount: 0,
    observationCount: 1,
    caenCoverage: 'COMPLETE',
    editionId: '7',
    editionSourceDate: '2026-09-30',
    anafCode: '4752',
    anafCodeForm: 'FOUR_DIGIT',
    anafCodeUsable: true,
    anafCaenFormPolicy: 'anaf-caen-form-policy-v1',
    anafStatusDate: '2026-05-18',
    agreement: 'MATCH_ONE_KEY',
    ...fields,
  }
}

const envelope = mapRegistryEnvelope(PUBLISHED)

describe('an older API (no activitySelection, no classState)', () => {
  it('parses and maps exactly as before: no selection, labels on known revisions, class state unknown', () => {
    const profile = mapCompanyProfile(companyProfileResponseSchema.parse(rawResponse()))
    expect(profile).not.toBeNull()
    expect(profile?.activitySelection).toBeNull()
    expect(profile?.caenActivities).toEqual([
      { code: '4752', rev: 'rev3', label: 'Comerț', source: 'onrc', labelSource: 'current_db_catalog', classState: null },
      { code: '4752', rev: null, label: null, source: 'anaf', labelSource: null, classState: null },
    ])
    expect(profile?.registry.caenObservations[0]).toMatchObject({ code: '4752', catalogLabel: 'Eticheta 4752', classState: null })
    expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
  })
})

describe('class state', () => {
  it('labels a class row only; a short token, an unknown revision, an unlabeled key and an unparsed row get no label', () => {
    const evidence = mapRegistryEvidence(
      rawRegistryEvidenceSchema.parse(
        rawResponse({}, [caenRow(1, '4752', 'rev3', 'CLASS'), caenRow(2, '4700', 'rev2', 'SHORT_TOKEN'), caenRow(3, '2864', 'rev2', 'UNLABELED_KEY'), caenRow(4, '6201', null, 'UNKNOWN_REVISION'), caenRow(5, '9999', 'rev2', 'UNPARSED')]).company.registry,
      ),
    )
    expect(evidence.caenObservations.map((row) => [row.code, row.classState, row.catalogLabel])).toEqual([
      ['4752', 'class', 'Eticheta 4752'],
      ['4700', 'short_token', null],
      ['2864', 'unlabeled_key', null],
      ['6201', 'unknown_revision', null],
      ['9999', 'unparsed', null],
    ])
  })

  it('reads a class state this client does not know as unparsed — never as a class', () => {
    const evidence = mapRegistryEvidence(rawRegistryEvidenceSchema.parse(rawResponse({}, [caenRow(1, '4752', 'rev3', 'SOMETHING_NEW')]).company.registry))
    expect(evidence.caenObservations[0]).toMatchObject({ classState: 'unparsed', catalogLabel: null })
  })

  it('keeps an ONRC activity label only for a class row, and no class state on ANAF', () => {
    const profile = mapCompanyProfile(
      companyProfileResponseSchema.parse(
        rawResponse({
          caenActivities: [
            { code: '4752', rev: 'rev3', label: 'Comerț', source: 'onrc', labelSource: 'current_db_catalog', classState: 'CLASS' },
            { code: '4700', rev: 'rev2', label: 'Împrumutat', source: 'onrc', labelSource: 'current_db_catalog', classState: 'SHORT_TOKEN' },
            { code: '4752', rev: null, label: null, source: 'anaf', labelSource: null, classState: null },
          ],
        }),
      ),
    )
    expect(profile?.caenActivities.map((row) => [row.code, row.source, row.label, row.classState])).toEqual([
      ['4752', 'onrc', 'Comerț', 'class'],
      ['4700', 'onrc', null, 'short_token'],
      ['4752', 'anaf', null, null],
    ])
  })
})

describe('mapActivitySelection', () => {
  it('maps an ONRC single-class selection with its own revision and exact label', () => {
    expect(mapActivitySelection(selection(), envelope)).toEqual({
      basis: 'onrc_single_class',
      source: 'onrc',
      code: '4752',
      revision: 'rev3',
      label: 'Comerț cu amănuntul al articolelor de fierărie',
      descriptionStatus: 'exact',
      descriptions: [],
      classKeyCount: 1,
      unqualifiedObservationCount: 0,
      observationCount: 1,
      caenCoverage: 'complete',
      editionId: '7',
      editionSourceDate: '2026-09-30',
      anafCode: '4752',
      anafCodeForm: 'four_digit',
      anafCodeUsable: true,
      anafCaenFormPolicy: 'anaf-caen-form-policy-v1',
      anafStatusDate: '2026-05-18',
      agreement: 'match_one_key',
    })
  })

  it('maps through the whole profile and keeps the edition-bound selection', () => {
    const profile = mapCompanyProfile(companyProfileResponseSchema.parse(rawResponse({ activitySelection: selection() })))
    expect(profile?.activitySelection?.basis).toBe('onrc_single_class')
    expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
  })

  it('never gives ANAF a revision, and a label only where every catalog revision agrees', () => {
    const consensus = mapActivitySelection(
      selection({
        basis: 'ANAF_FISCAL_CODE',
        source: 'ANAF',
        code: '6920',
        revision: 'rev2',
        label: 'Contabilitate',
        descriptionStatus: 'CONSENSUS',
        descriptions: [
          { revision: 'rev2', label: 'Contabilitate' },
          { revision: 'rev3', label: 'Contabilitate' },
          { revision: 'rev9', label: 'Necunoscută' },
        ],
        classKeyCount: 0,
        observationCount: 0,
        caenCoverage: 'COMPLETE_EMPTY',
        agreement: 'NO_CLASS_KEY',
      }),
      envelope,
    )
    expect(consensus).toMatchObject({ basis: 'anaf_fiscal_code', source: 'anaf', revision: null, label: 'Contabilitate', descriptionStatus: 'consensus' })
    expect(consensus?.descriptions).toEqual([
      { revision: 'rev2', label: 'Contabilitate' },
      { revision: 'rev3', label: 'Contabilitate' },
    ])
    const conflict = mapActivitySelection(
      selection({ basis: 'ANAF_FISCAL_CODE', source: 'ANAF', code: '6201', revision: null, label: 'Borrowed', descriptionStatus: 'CONFLICT', classKeyCount: 0, agreement: 'NO_CLASS_KEY' }),
      envelope,
    )
    expect(conflict).toMatchObject({ revision: null, label: null, descriptionStatus: 'conflict' })
  })

  it('keeps an uncatalogued ANAF code as a source observation: no label, no revision, no catalog text', () => {
    expect(
      mapActivitySelection(
        selection({ basis: 'ANAF_FISCAL_UNCATALOGUED', source: 'ANAF', code: '0111', revision: 'rev2', label: 'x', descriptions: [{ revision: 'rev2', label: 'x' }], classKeyCount: 0, agreement: 'NO_CLASS_KEY' }),
        envelope,
      ),
    ).toMatchObject({ basis: 'anaf_fiscal_uncatalogued', code: '0111', revision: null, label: null, descriptions: [] })
  })

  it('selects no code for several classes or no qualified selection', () => {
    expect(mapActivitySelection(selection({ basis: 'ONRC_MULTIPLE_CLASSES', code: '4752', revision: 'rev3', classKeyCount: 3, agreement: 'DIFFERS' }), envelope)).toMatchObject({
      basis: 'onrc_multiple_classes',
      source: null,
      code: null,
      revision: null,
      label: null,
    })
    expect(mapActivitySelection(selection({ basis: 'NO_QUALIFIED_SELECTION', source: null, code: null, revision: null, classKeyCount: 0, agreement: 'ANAF_MISSING', anafCodeForm: 'ABSENT', anafCode: null }), envelope)).toMatchObject({
      basis: 'no_qualified_selection',
      code: null,
      agreement: 'anaf_missing',
      anafCodeForm: 'absent',
    })
  })

  it('keeps the database’s usability verdict and policy as sent; a form it does not know degrades to unqualified, never usable by guess', () => {
    expect(mapActivitySelection(selection({ basis: 'NO_QUALIFIED_SELECTION', source: null, code: null, revision: null, classKeyCount: 0, anafCode: '0111', anafCodeForm: 'THREE_DIGIT', anafCodeUsable: false, agreement: 'ANAF_NOT_USABLE' }), envelope)).toMatchObject({
      anafCodeForm: 'three_digit',
      anafCodeUsable: false,
      anafCaenFormPolicy: 'anaf-caen-form-policy-v1',
    })
    expect(mapActivitySelection(selection({ anafCodeForm: 'FIVE_DIGIT' }), envelope)).toMatchObject({ basis: 'onrc_single_class', anafCodeForm: 'unqualified', anafCodeUsable: true })
    // Not sent (a recorded answer): unknown, never decided here.
    const { anafCodeUsable: _usable, anafCaenFormPolicy: _policy, ...older } = selection()
    expect(mapActivitySelection(older, envelope)).toMatchObject({ anafCodeUsable: null, anafCaenFormPolicy: null })
  })

  it('fails closed: another edition, an unknown enum, a non-derived answer or one that does not hold together is no selection', () => {
    expect(mapActivitySelection(selection({ editionId: '6' }), envelope)).toBeNull()
    expect(mapActivitySelection(selection(), mapRegistryEnvelope({ ...PUBLISHED, state: 'UNPUBLISHED', editionId: null }))).toBeNull()
    expect(mapActivitySelection(selection({ basis: 'PRINCIPAL' }), envelope)).toBeNull()
    expect(mapActivitySelection(selection({ derived: false }), envelope)).toBeNull()
    // An ONRC selection without its own known revision, a single class that is not one, a match that did not match.
    expect(mapActivitySelection(selection({ revision: null }), envelope)).toBeNull()
    expect(mapActivitySelection(selection({ classKeyCount: 2 }), envelope)).toBeNull()
    expect(mapActivitySelection(selection({ basis: 'ONRC_CLASS_ANAF_NUMERIC_MATCH', classKeyCount: 2, agreement: 'DIFFERS' }), envelope)).toBeNull()
    // An ANAF selection where the edition holds a class.
    expect(mapActivitySelection(selection({ basis: 'ANAF_FISCAL_CODE', source: 'ANAF', revision: null, classKeyCount: 1 }), envelope)).toBeNull()
  })
})

describe('a selection the API refuses alone', () => {
  const refusal = (path: readonly (string | number)[]) =>
    new GraphQLRequestError('too many groups', { graphQLErrors: [{ message: 'too many groups', path, extensions: { code: 'SERVICE_UNAVAILABLE' } }] })

  it('asks for the company again without it, and says the selection is unavailable — never the older headline in its place', async () => {
    transport.calls = []
    transport.answer = (document) => (document.includes('activitySelection') ? Promise.reject(refusal(['company', 'activitySelection'])) : Promise.resolve(rawResponse()))
    const profile = await fetchPrivateCompanyProfileLive('2816464')
    expect(transport.calls).toHaveLength(2)
    expect(transport.calls[1]).not.toContain('activitySelection')
    expect(profile?.activitySelection).toBeNull()
    expect(profile?.activitySelectionUnavailable).toBe(true)
    expect(profile?.legalName).toBe('DEDEMAN SRL')
  })

  it('reads an older API (which rejects the new fields at validation) with the older document, exactly as before', async () => {
    transport.calls = []
    const rejected = new GraphQLRequestError('validation', {
      graphQLErrors: [
        { message: 'Cannot query field "classState" on type "CompanyCaenActivity".' },
        { message: 'Cannot query field "activitySelection" on type "Company".' },
        { message: 'Cannot query field "classState" on type "CompanyRegistryCaenObservation". Did you mean "parseState"?' },
      ],
    })
    transport.answer = (document) => (document.includes('classState') ? Promise.reject(rejected) : Promise.resolve(rawResponse()))
    const profile = await fetchPrivateCompanyProfileLive('2816464')
    expect(transport.calls).toHaveLength(2)
    expect(transport.calls[1]).not.toMatch(/classState|activitySelection/u)
    expect(profile?.activitySelection).toBeNull()
    expect(profile?.activitySelectionUnavailable).toBeUndefined()
    expect(profile?.registry.caenObservations[0]?.catalogLabel).toBe('Eticheta 4752')
  })

  it('lets any other error fail the read as before', async () => {
    transport.calls = []
    transport.answer = () => Promise.reject(refusal(['company', 'registry']))
    await expect(fetchPrivateCompanyProfileLive('2816464')).rejects.toThrow('too many groups')
    expect(transport.calls).toHaveLength(1)
  })
})
