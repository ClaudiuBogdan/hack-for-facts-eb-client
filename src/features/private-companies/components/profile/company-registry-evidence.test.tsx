import type { ReactNode } from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CompanyRegistryEvidence } from '@/schemas/private-company-registry'
import { mapRegistryEvidence, rawRegistryEvidenceSchema } from '../../api/graphql/company-registry-graphql'
import { companyProfile } from '../../lib/company-profile.fixture'
import { buildCompanyProfileModel } from '../../lib/company-profile-model'
import { CompanyRegistryBand } from './company-registry-band'
import { CompanyRegistryEvidenceList } from './company-registry-evidence'

/**
 * The edition's identifiers, from hand-written API19 answers through the real
 * parse and mapping (C20-R5): each with its own statuses, none chosen; rows
 * of the same name that disagree are said by the qualified values' "different
 * values" basis. The edition's original rows are not listed (owner, 14
 * October 2026).
 */

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { readonly children: ReactNode; readonly to: string }) => <a href={to}>{children}</a>,
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))

const ENVELOPE = {
  source: 'onrc',
  state: 'PUBLISHED',
  editionId: '7',
  sourceSnapshotId: 'firme-7',
  sourcePublishedAt: '2026-09-30',
  interpretationVersion: 'onrc-interp-v1',
  dimensionPolicyVersion: 'onrc-dim-v1',
  eligibilityPolicyVersion: 'onrc-elig-v1',
  publicationEpoch: '3',
  accessEpoch: '11',
  reason: null,
  scopeKey: 'onrc:published:7:3:11',
}
const value = (text: string | null, basis: string) => ({ value: text, basis })
const provenance = (row: number) => ({
  resourceKey: 'OD_FIRME',
  sourceRowNumber: row,
  sourceRowSha256: 'ab'.repeat(32),
  sourceUrl: 'https://data.gov.ro/dataset/firme/od_firme.csv',
  sourceFileSha256: 'cd'.repeat(32),
  sourcePublishedAt: '2026-09-30',
})
const identityRow = (id: string, row: number, fields: Record<string, unknown>) => ({
  id,
  identifierKey: null,
  name: 'ALFA SRL',
  legalForm: null,
  recordedDate: null,
  recordedDateState: 'blank',
  countyCode: null,
  provenance: provenance(row),
  ...fields,
})

/** The CUI's qualified values: one name; legal form, recorded date and county disagreeing across the rows. */
const PROFILE = {
  identityObservations: 2,
  identifierCount: 0,
  unresolvedIdentifierCount: 0,
  unidentifiedObservations: 2,
  name: value('ALFA SRL', 'CONSISTENT_OBSERVATIONS'),
  legalForm: value(null, 'MULTIPLE_VALUES'),
  recordedDate: value(null, 'MULTIPLE_VALUES'),
  countyCode: value(null, 'MULTIPLE_VALUES'),
  countyName: null,
  uatSirutaCode: value(null, 'MISSING'),
  uatName: null,
  statusCode: value(null, 'MISSING'),
  caenCoverage: 'UNRESOLVED',
  statusCoverage: 'UNRESOLVED',
}

/** An IN_EDITION answer for the CUI: no identifier group unless a test gives one. */
function evidence(fields: Record<string, unknown>): CompanyRegistryEvidence {
  return mapRegistryEvidence(
    rawRegistryEvidenceSchema.parse({
      registry: ENVELOPE,
      cuiState: 'IN_EDITION',
      profile: PROFILE,
      identifiers: [],
      identityObservations: [],
      caenObservations: [],
      statusObservations: [],
      observationsTruncated: false,
      ...fields,
    }),
  )
}

const TWO_ALFAS = [
  identityRow('i-12', 12, { legalForm: 'SRL', recordedDate: '2002-03-04', recordedDateState: 'date', countyCode: 'CJ', identifierKey: 'J12/100/2002' }),
  identityRow('i-40', 40, { legalForm: 'SA', recordedDate: '2010-05-06', recordedDateState: 'date', countyCode: 'B' }),
]

const IDENTIFIER = {
  id: 'g-1',
  identifierKey: 'J12/100/2002',
  identityRowCount: 1,
  statusCodes: ['1048', '1050'],
  hasActiveObservation: true,
  countyCodes: ['CJ'],
  countyBasis: 'CONSISTENT_OBSERVATIONS',
  caenObservations: 0,
  unknownRevisionCaenObservations: 0,
}

describe('CompanyRegistryEvidenceList', () => {
  it('lists each identifier with its statuses and county, and no original row', () => {
    render(<CompanyRegistryEvidenceList evidence={evidence({ identifiers: [IDENTIFIER], identityObservations: TWO_ALFAS, observationsTruncated: true })} />)
    const identifiers = within(screen.getByTestId('company-registry-identifiers'))
    expect(identifiers.getByText('J12/100/2002')).toBeInTheDocument()
    const statuses = identifiers.getByText('J12/100/2002').nextElementSibling?.textContent ?? ''
    expect(statuses).toMatch(/^1048\b.*; 1050\b/u)
    expect(statuses).toMatch(/ · Cluj$/u)
    expect(identifiers.getByText(/^\(are o înscriere „în funcțiune” alături de alte stări\)$/u)).toBeInTheDocument()
    expect(screen.queryByTestId('company-registry-rows')).toBeNull()
    expect(screen.queryByText(/ALFA SRL|înscrieri originale|rândul/u)).toBeNull()
  })

  it('shows nothing when the edition resolved no identifier group: rows alone are not listed', () => {
    render(<CompanyRegistryEvidenceList evidence={evidence({ identityObservations: [identityRow('i-7', 7, { legalForm: 'SRL' })] })} />)
    expect(screen.queryByTestId('company-registry-evidence')).toBeNull()
  })

  it('says two rows of the same name disagree by the "different values" basis, choosing none', () => {
    const registry = evidence({ identityObservations: TWO_ALFAS })
    const model = buildCompanyProfileModel(companyProfile({ legalName: 'ALFA SRL', legalForm: null, registrationDate: null, geography: null, registry }))
    render(<CompanyRegistryBand model={model} index="05 / Registru" procurement={null} diffText={null} />)
    const fact = (term: string) => screen.getByText(term, { selector: 'dt' }).nextElementSibling?.textContent
    expect(fact('Formă juridică')).toBe('— (înscrieri cu valori diferite)')
    expect(fact('Data înregistrată de ONRC')).toBe('— (înscrieri cu valori diferite)')
    expect(screen.queryByTestId('company-registry-rows')).toBeNull()
  })
})
