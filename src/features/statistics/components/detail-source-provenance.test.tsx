import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/test/test-utils'
import { DetailObservationsTable } from './detail-observations-table'
import { DetailExportButton } from './detail-export-button'
import {
  sourceDescriptor,
  sourceObservation,
} from '../lib/source-observations.test-fixtures'
import { downloadObservationsCsv } from '../lib/observations-csv'

vi.mock('../lib/observations-csv', async (original) => ({
  ...(await original<typeof import('../lib/observations-csv')>()),
  downloadObservationsCsv: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))
beforeEach(() => vi.clearAllMocks())

describe('native source inspection table', () => {
  it('shows every declared source axis, original values and contextual qualifications', async () => {
    render(
      <DetailObservationsTable
        sourceDescriptor={sourceDescriptor}
        observations={[sourceObservation()]}
      />,
    )
    expect(
      screen.getByText('-123456789012345678901.2300', { exact: true }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /Geografie unu D1/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /Geografie doi D2/ }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByText('Interpretare calificată'))
    expect(screen.getByText(/Context teritorial/)).toHaveTextContent(
      'B (NUTS3)',
    )
    expect(
      screen.queryByText(/Teritoriu rezolvat exact/),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('Source methodology, not a fiscal hierarchy.'),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Deschide sursa INS' }),
    ).toHaveAttribute('href', sourceDescriptor.metadata.source_url)
  })
  it('shows a status even when its numeric value is unavailable', () => {
    render(
      <DetailObservationsTable
        sourceDescriptor={sourceDescriptor}
        observations={[sourceObservation({ value: null, value_status: 'c' })]}
      />,
    )
    expect(screen.getByText('c', { selector: 'sup' })).toBeInTheDocument()
  })
  it('keeps non-HTTP source references inert', async () => {
    render(
      <DetailObservationsTable
        sourceDescriptor={{
          ...sourceDescriptor,
          metadata: {
            ...sourceDescriptor.metadata,
            source_url: 'javascript:alert(1)',
          },
        }}
        observations={[sourceObservation()]}
      />,
    )
    await userEvent.click(screen.getByText('Interpretare calificată'))
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('javascript:alert(1)')).toBeVisible()
  })
})

describe('complete source export action', () => {
  it('does not download an incomplete inspection preview', async () => {
    render(
      <DetailExportButton
        datasetCode="TEST"
        sourceDescriptor={sourceDescriptor}
        observations={[sourceObservation()]}
        disabled={false}
        complete={false}
      />,
    )
    const button = screen.getByRole('button', { name: 'Descarcă CSV' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(downloadObservationsCsv).not.toHaveBeenCalled()
  })
  it('validates the descriptor before starting a download', async () => {
    render(
      <DetailExportButton
        datasetCode="TEST"
        sourceDescriptor={{}}
        observations={[sourceObservation()]}
        disabled={false}
        complete
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Descarcă CSV' }))
    expect(downloadObservationsCsv).not.toHaveBeenCalled()
  })
  it('exports qualified source rows without pretending their geography is exact', async () => {
    render(
      <DetailExportButton
        datasetCode="TEST"
        sourceDescriptor={sourceDescriptor}
        observations={[sourceObservation()]}
        disabled={false}
        complete
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Descarcă CSV' }))
    expect(downloadObservationsCsv).toHaveBeenCalledWith(
      expect.stringContaining('CONTEXTUAL'),
      expect.stringMatching(/^TEST-/),
    )
  })
})
