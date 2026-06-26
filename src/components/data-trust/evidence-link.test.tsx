import { describe, expect, it } from 'vitest'
import { EvidenceLink } from './evidence-link'
import { ProvenanceProvider } from './provenance-context'
import { SourceProvenanceDrawer } from './source-provenance-drawer'
import type { SourcePointer } from '@/schemas/elections'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

const accessiblePointer: SourcePointer = {
  sourceResourceId: 'aep-ckan-local-2024-results',
  sourceFileId: 'cluj_napoca_primar.csv',
  sourceRowNumber: 1842,
  sourceRowHash: 'sha256:local2024clujprimar1842',
  sourceUpdatedAt: '2024-06-12T10:30:00Z',
  authority: 'AEP',
  sourceFamily: 'aep_ckan_csv_2024_local',
  resourceUrl: 'https://data.gov.ro/',
  accessStatus: 'ok',
}

const inaccessiblePointer: SourcePointer = {
  sourceResourceId: 'aep-archive-2004-local-cluj',
  sourceFileId: null,
  sourceRowNumber: null,
  sourceRowHash: 'sha256:archive-evidence-only',
  sourceUpdatedAt: null,
  authority: 'AEP',
  sourceFamily: 'aep_legacy_archive',
  resourceUrl: null,
  accessStatus: 'inaccessible_with_evidence',
}

function renderProvenanceExample(pointers: readonly SourcePointer[]) {
  return render(
    <ProvenanceProvider>
      <EvidenceLink
        pointers={pointers}
        context={{
          entityTitle: 'Primar - Cluj-Napoca',
          metricLabel: 'Voturi',
          sourceMetricCode: null,
          mappingStatus: 'mapat',
          resolverVersion: 'mock-read-model-v1',
          valueDisplay: '54.265',
        }}
      >
        sursa
      </EvidenceLink>
      <SourceProvenanceDrawer />
    </ProvenanceProvider>,
  )
}

describe('EvidenceLink and SourceProvenanceDrawer', () => {
  it('opens the drawer with source resource, file, row, hash, authority, and freshness', async () => {
    const user = userEvent.setup()
    renderProvenanceExample([accessiblePointer])

    await user.click(screen.getByRole('button', { name: 'sursa' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Primar - Cluj-Napoca')).toBeInTheDocument()
    expect(screen.getByText('aep-ckan-local-2024-results')).toBeInTheDocument()
    expect(screen.getByText('cluj_napoca_primar.csv')).toBeInTheDocument()
    expect(screen.getByText('1.842')).toBeInTheDocument()
    expect(screen.getByText(/sha256:loc\.\.\./)).toBeInTheDocument()
    expect(screen.getAllByText('AEP').length).toBeGreaterThan(0)
    expect(screen.getAllByText('aep_ckan_csv_2024_local').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/2024/i).length).toBeGreaterThan(0)
  })

  it('shows inaccessible source evidence gap state without inventing a public link', async () => {
    const user = userEvent.setup()
    renderProvenanceExample([inaccessiblePointer])

    await user.click(screen.getByRole('button', { name: 'sursa' }))

    expect(screen.getByText('Sursa inaccesibila (cu dovada)')).toBeInTheDocument()
    expect(
      screen.getByText(/Nu avem un link public functional pentru aceasta resursa/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Deschide resursa oficiala' })).not.toBeInTheDocument()
  })
})
