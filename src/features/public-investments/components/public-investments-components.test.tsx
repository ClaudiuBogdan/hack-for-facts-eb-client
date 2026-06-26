import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { AmountWithEvidence } from './AmountWithEvidence'
import { PublicInvestmentsMapPanel } from './PublicInvestmentsMapPanel'
import { SourceProvenanceDrawer } from './SourceProvenanceDrawer'
import {
  MOCK_EVIDENCE_DETAILS,
  MOCK_OBJECTIVE_SUMMARIES,
} from '../mocks/public-investments-mock-data'
import { REDACTED_NAME_MARKER_KEY } from '../lib/filters'
import type { EvidenceDetail } from '../lib/types'
import type { PublicInvestmentsQueryResult } from '../hooks/use-public-investments-data'

const mocks = vi.hoisted(() => ({
  useEvidenceDetail: vi.fn(),
}))

vi.mock('../hooks/use-public-investments-data', () => ({
  useEvidenceDetail: (sourceRowKey: string | null | undefined) =>
    mocks.useEvidenceDetail(sourceRowKey),
}))

function queryResult<TData>(
  data: TData | undefined,
  overrides: Partial<PublicInvestmentsQueryResult<TData>> = {},
): PublicInvestmentsQueryResult<TData> {
  return {
    data,
    isBlocked: false,
    blockedReason: undefined,
    blockedMessageKey: undefined,
    blockedMessageParams: undefined,
    isLoading: false,
    isFetching: false,
    isPlaceholderData: false,
    isStale: false,
    isEmpty: false,
    isError: false,
    error: null,
    ...overrides,
  }
}

describe('AmountWithEvidence', () => {
  it('hides suspect x1000 amounts behind a verification state', () => {
    const onEvidenceOpen = vi.fn()
    const evidenceRef = MOCK_OBJECTIVE_SUMMARIES.find(
      (objective) => objective.objectiveId === 'pi-pnccrs-bv-fagaras',
    )?.evidenceRef

    expect(evidenceRef).toBeDefined()

    render(
      <AmountWithEvidence
        label="Contractat"
        value={{
          amount: 5_200_000_000,
          confidence: 'suspect_x1000',
          raw: '5.200.000.000',
        }}
        evidenceRef={evidenceRef}
        onEvidenceOpen={onEvidenceOpen}
      />,
    )

    expect(screen.getAllByText('Valoare în verificare').length).toBeGreaterThan(0)
    expect(screen.getByText('Contractat')).toBeInTheDocument()
    expect(screen.queryByText(/5\.200\.000\.000/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deschide dovada sursei' })).toBeInTheDocument()
  })
})

describe('SourceProvenanceDrawer', () => {
  it('renders provenance while redacting gated party identifiers', () => {
    const detail: EvidenceDetail = {
      ...MOCK_EVIDENCE_DETAILS['evidence-anghel-cl-napoca-gated-contract'],
      redactionMarkerKey: REDACTED_NAME_MARKER_KEY,
    }
    mocks.useEvidenceDetail.mockReturnValue(queryResult(detail))

    render(
      <SourceProvenanceDrawer
        sourceRowKey="evidence-anghel-cl-napoca-gated-contract"
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Dovada sursei')).toBeInTheDocument()
    expect(screen.getByText('Fișier tabelar')).toBeInTheDocument()
    expect(screen.getByText('anghel-saligny-2026-05.xlsx')).toBeInTheDocument()
    expect(screen.getByText('pi-anghel-cl-napoca-gated')).toBeInTheDocument()
    expect(screen.getByText('Identificatorii cu risc personal sunt reținuți în extras.')).toBeInTheDocument()
    expect(screen.getAllByText(/nume reținut - verificare în curs/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Popescu Ion Aurel/)).not.toBeInTheDocument()
    expect(screen.queryByText(/99887766/)).not.toBeInTheDocument()
  })

  it('shows the missing-evidence honesty state for not-found rows', () => {
    mocks.useEvidenceDetail.mockReturnValue(
      queryResult(undefined, {
        isBlocked: true,
        blockedReason: 'not-found',
        blockedMessageParams: { code: 'evidence-missing' },
      }),
    )

    render(
      <SourceProvenanceDrawer
        sourceRowKey="evidence-missing"
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Înregistrare negăsită')).toBeInTheDocument()
    expect(screen.getByText(/evidence-missing/)).toBeInTheDocument()
  })
})

describe('PublicInvestmentsMapPanel', () => {
  it('renders the mock-first analytical map fallback with localized point count', () => {
    render(<PublicInvestmentsMapPanel points={MOCK_LANDING_POINTS} />)

    expect(screen.getByRole('heading', { name: 'Hartă investiții' })).toBeInTheDocument()
    expect(screen.getByText('2 localizate')).toBeInTheDocument()
    expect(screen.getByLabelText(/Reabilitare rețea de apă și canalizare/)).toBeInTheDocument()
    expect(screen.getByText(/Valorile suspecte ×1000 sunt păstrate ca puncte/)).toBeInTheDocument()
  })
})

const MOCK_LANDING_POINTS = MOCK_OBJECTIVE_SUMMARIES.map((objective) => ({
  objectiveId: objective.objectiveId,
  program: objective.program,
  title: objective.title,
  county: objective.county,
  uat: objective.uat,
  siruta: objective.siruta,
  lat: objective.objectiveId === 'pi-pnmc-if-magic' ? null : objective.lat,
  lng: objective.objectiveId === 'pi-pnmc-if-magic' ? null : objective.lng,
  contracted:
    objective.contracted?.confidence === 'suspect_x1000'
      ? { ...objective.contracted, amount: null }
      : objective.contracted,
  absorptionPct:
    objective.contracted?.confidence === 'suspect_x1000'
      ? null
      : objective.absorptionPct,
  stage: objective.stage,
})).filter((point) =>
  point.objectiveId === 'pi-anghel-cj-apahida' ||
  point.objectiveId === 'pi-anghel-cl-napoca-gated' ||
  point.objectiveId === 'pi-pnmc-if-magic',
)
