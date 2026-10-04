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
 * The edition's original rows, from hand-written API19 answers through the
 * real parse and mapping (C20-R5): a row is shown whether or not an
 * identifier group was resolved for it, each identity row with every value it
 * carries — so rows of the same name that disagree on legal form, recorded
 * date or county read apart beside the "different values" basis — a value the
 * row lacks shown as lacking, every row with its provenance; and a truncated
 * list counts the rows shown, never the edition's.
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

describe('CompanyRegistryEvidenceList', () => {
  it('shows an identity row and its provenance when the edition resolved no identifier group for it', () => {
    render(<CompanyRegistryEvidenceList evidence={evidence({ identityObservations: [identityRow('i-7', 7, { legalForm: 'SRL' })] })} />)
    const rows = within(screen.getByTestId('company-registry-rows'))
    expect(rows.getByText('ALFA SRL')).toBeInTheDocument()
    // Each value as the row has it; what it lacks is said as lacking, and it has no identifier.
    expect(rows.getByText('formă juridică: SRL · data înregistrată: — · județ: — · fără identificator de înregistrare')).toBeInTheDocument()
    const source = rows.getByRole('link', { name: 'OD_FIRME, rândul 7' })
    expect(source).toHaveAttribute('href', 'https://data.gov.ro/dataset/firme/od_firme.csv')
    // No identifier group to list, and none invented.
    expect(screen.queryByTestId('company-registry-identifiers')).toBeNull()
  })

  it('sets two rows of the same name apart by their legal form, recorded date and county, beside the "different values" basis', () => {
    const registry = evidence({ identityObservations: TWO_ALFAS })
    const model = buildCompanyProfileModel(companyProfile({ legalName: 'ALFA SRL', legalForm: null, registrationDate: null, geography: null, registry }))
    render(<CompanyRegistryBand model={model} index="05 / Registru" procurement={null} diffText={null} />)
    // The qualified values say the rows disagree, and choose none.
    const fact = (term: string) => screen.getByText(term, { selector: 'dt' }).nextElementSibling?.textContent
    expect(fact('Formă juridică')).toBe('— (înscrieri cu valori diferite)')
    expect(fact('Data înregistrată de ONRC')).toBe('— (înscrieri cu valori diferite)')
    // The rows behind them: both shown, each with its own values and its own source row.
    const rows = within(screen.getByTestId('company-registry-rows'))
    expect(rows.getAllByText('ALFA SRL')).toHaveLength(2)
    expect(rows.getByText(/^formă juridică: SRL · data înregistrată: 4 mar\.? 2002 · județ: Cluj · identificator: J12\/100\/2002$/u)).toBeInTheDocument()
    expect(rows.getByText(/^formă juridică: SA · data înregistrată: 6 mai 2010 · județ: București · fără identificator de înregistrare$/u)).toBeInTheDocument()
    expect(rows.getByRole('link', { name: 'OD_FIRME, rândul 12' })).toBeInTheDocument()
    expect(rows.getByRole('link', { name: 'OD_FIRME, rândul 40' })).toBeInTheDocument()
  })

  it('counts a truncated list as the rows shown, never as the edition’s complete count', () => {
    render(<CompanyRegistryEvidenceList evidence={evidence({ identityObservations: TWO_ALFAS, observationsTruncated: true })} />)
    const rows = screen.getByTestId('company-registry-rows')
    expect(within(rows).getByText('2 înscrieri originale afișate')).toBeInTheDocument()
    expect(within(rows).getByText('Lista e scurtată: ediția are mai multe înscrieri decât cele afișate aici.')).toBeInTheDocument()
    expect(rows.textContent).not.toMatch(/numărul complet/u)
    // An untruncated list is a plain count.
    render(<CompanyRegistryEvidenceList evidence={evidence({ identityObservations: TWO_ALFAS })} />)
    expect(screen.getByText('2 înscrieri originale')).toBeInTheDocument()
  })
})
